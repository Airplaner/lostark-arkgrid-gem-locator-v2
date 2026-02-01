import type { ArkGridAttr } from '../constants/enums';
import { type ArkGridGem, isSameArkGridGem } from '../models/arkGridGems';
import type { CaptureWorkerRequest, CaptureWorkerResponse } from './types';

export class CaptureController {
  state: 'idle' | 'loading' | 'recording' | 'closing' = 'idle';
  reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
  worker: Worker | null = null;
  debugCanvas: HTMLCanvasElement | null = null;

  // 👇 기다리는 Promise들의 resolver
  private awaitWorkerInitialization: (() => void) | null = null;
  private awaitFrameCompletion: (() => void) | null = null;
  private frameTimes: number[] = [];
  private imageTimes: number[][] = Array.from({ length: 9 }, () => []);
  onFrameDone: ((gemAttr: ArkGridAttr, gems: ArkGridGem[]) => void) | null = null; // 외부에서 등록해주면 분석 완료됐을 때 불러줌

  constructor(debugCanvas?: HTMLCanvasElement | null) {
    if (debugCanvas) this.debugCanvas = debugCanvas;
  }

  // type-safe wrapper
  postMessage(msg: CaptureWorkerRequest) {
    if (!this.worker) throw Error('worker is not set');
    this.worker.postMessage(msg);
  }
  getFrameStats() {
    if (this.frameTimes.length === 0) return null;

    const t = this.frameTimes;

    return {
      avg: t.reduce((a, b) => a + b, 0) / t.length,
      min: Math.min(...t),
      max: Math.max(...t),
      count: t.length,
    };
  }
  getImageStats() {
    return this.imageTimes.map((times, index) => {
      if (times.length === 0) return null;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;

      return {
        index,
        avg,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length,
      };
    });
  }
  private handleWorkerMessage(e: MessageEvent<CaptureWorkerResponse>) {
    const data = e.data;

    switch (data.type) {
      case 'init:done':
        this.awaitWorkerInitialization?.();
        this.awaitWorkerInitialization = null;
        break;

      case 'frame:done':
        // release lock
        this.awaitFrameCompletion?.();
        this.awaitFrameCompletion = null;

        // 외부에서 등록된 콜백 불러줌

        /* 
        queueMicrotask(() => { ... }) 안의 코드는:

        지금 실행 ❌
        현재 call stack 끝난 뒤 실행 ⭕

        TypeScript는 이렇게 생각해:

        “이 콜백이 실행될 때까지
        this.onFrameDone이나 data.result가
        바뀌지 않는다는 보장이 없다.”
        */
        const result = data.result;
        const onFrameDone = this.onFrameDone;
        if (onFrameDone && result) {
          queueMicrotask(() => {
            onFrameDone(result.gemAttr, result.gems);
          });
        }
        break;

      case 'error':
        console.error('Worker error:', data.error);
        this.awaitWorkerInitialization?.();
        this.awaitWorkerInitialization = null;
        break;

      case 'debug':
        try {
          if (data.message) console.log(data.message);
          if (data.image && this.debugCanvas) {
            this.debugCanvas.width = data.image.width;
            this.debugCanvas.height = data.image.height;
            this.debugCanvas.getContext('2d')?.drawImage(data.image, 0, 0);
          }
        } finally {
          if (data.image) data.image.close();
        }
    }
  }

  private async requestDisplayMedia() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      if (!stream) {
        throw Error('화면 공유에 실패하였습니다.');
      }
      const track = stream.getVideoTracks()[0];
      const processor = new MediaStreamTrackProcessor({ track });
      this.reader = processor.readable.getReader();
    } catch (err: any) {
      throw Error('화면 공유를 거부하였습니다.');
    }
    return;
  }

  async startCapture(debugMode: boolean = false) {
    // idle 상태에서만 가능
    // 녹화를 시작합니다.
    // worker를 생성하고 어셋 로드를 시킨 뒤, 사용자에게 화면 공유를 요청합니다.
    // 둘 다 완료되면 루프를 시작합니다.
    if (this.state !== 'idle') {
      console.log(this.state, 'is not idle');
      return;
    }

    // loading으로 전환 (lock)
    this.state = 'loading';
    let started = false;

    try {
      // worker 생성 이후 handler 등록
      if (!this.worker) {
        this.worker = new Worker(new URL('./captureWorker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
      }
      // worker의 init을 기다리는 promise 만든 후 init 요청 보냄
      const waitForInit = new Promise<void>((resolve) => {
        this.awaitWorkerInitialization = resolve;
      });
      this.postMessage({ type: 'init' });

      // debug 모드라면 debugCanvas도 만들도록 시킴
      if (debugMode) {
        this.postMessage({ type: 'debug' });
      }

      // 초기화되는 동안 사용자에게 화면 공유 요청
      await this.requestDisplayMedia();

      // 완료되면 reader가 설정되어서 읽을 수 있음
      if (!this.reader) {
        throw Error('reader is not ready');
      }

      // 첫 프레임을 읽을 수 있을 때까지 대기
      const { value, done } = await this.reader.read();
      if (done) {
        throw Error('Failed to read even a frame');
      }
      // opencv 및 어셋 로딩이 끝날 때까지 대기
      await waitForInit;

      // 프레임 캡쳐 및 전송 loop로 이동
      console.log('init done!');
      started = true;
      this.state = 'recording';
      this.loop();
    } finally {
      if (!started) {
        this.state = 'idle';
      }
    }
  }

  async loop() {
    // state가 recording이라면, reader로부터 프레임을 읽어서 worker에게 전달 및 결과를 기다린다.
    while (this.state == 'recording') {
      if (!this.reader) {
        throw Error('reader not exists');
      }
      const { value, done } = await this.reader.read();
      if (done) break;
      if (!this.worker) {
        throw Error('worker not exists');
      }

      // 분석이 끝나면 resolve되는 promise 생성
      const waitForAnalysis = new Promise<void>((resolve) => {
        this.awaitFrameCompletion = resolve;
      });
      // 현재 frame을 postMessage
      const start = performance.now();
      this.worker.postMessage({ type: 'frame', frame: value } satisfies CaptureWorkerRequest, [
        value,
      ]);
      // 주의: value 소유권은 worker에게 넘어갔으니 더 이상 건드리면 안 됨
      await waitForAnalysis;

      const timeElapsed = performance.now() - start;
      this.frameTimes.push(timeElapsed);
      while (this.frameTimes.length > 10) {
        this.frameTimes.shift();
      }
      console.log(
        `${timeElapsed.toFixed(2)}ms`,
        `fps: ${(1000 / (this.frameTimes.reduce((acc, v) => acc + v, 0) / this.frameTimes.length)).toFixed(2)}`
      );
    }
    // loop가 탈출되면 idle로 설정
    this.state = 'idle';
  }

  async stopCapture() {
    // 위 루프에서 read나 waitForAnalysis같은 Promise는 취소할 수 없기 때문에,
    // 애초에 promise를 만들 때부터 취소 신호를 가진 Promise와 race 시켜야 한다.
    // (취소 신호를 가진 Promise가 먼저 reject되면 원본은 기다리지 않고 탈출하기 때문에 취소 효과가 됨)
    // 너무 장황해지는 거 같아서 loop 종료로...
    if (this.state === 'recording') {
      this.state = 'closing'; // 추후 loop 탈출 이후 idle로 가는 것을 기대
    }
  }
}
