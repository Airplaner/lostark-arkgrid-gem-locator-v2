import type { ArkGridAttr } from '../constants/enums';
import { type ArkGridGem, isSameArkGridGem } from '../models/arkGridGems';
import type { CaptureWorkerRequest, CaptureWorkerResponse } from './types';

export class CaptureController {
  private state: 'idle' | 'loading' | 'recording' | 'closing' = 'idle';

  // 화면 녹화 기능들
  private reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
  private track: MediaStreamVideoTrack | null = null;

  // web worker
  private worker: Worker | null = null;

  // debug
  private debugCanvas: HTMLCanvasElement | null = null;

  // 👇 기다리는 Promise들의 resolver
  private awaitWorkerInitialization: (() => void) | null = null;
  private awaitFrameCompletion: (() => void) | null = null;

  // 성능 측정용
  private frameTimes: number[] = [];

  // 외부 등록 콜백
  onFrameDone: ((gemAttr: ArkGridAttr, gems: ArkGridGem[]) => void) | null = null; // 분석 완료
  onLoad: (() => void) | null = null; // worker 준비 완료
  onReady: (() => void) | null = null; // 프레임 소비 완료
  onStop: (() => void) | null = null; // 녹화 중단

  constructor(debugCanvas?: HTMLCanvasElement | null) {
    if (debugCanvas) this.debugCanvas = debugCanvas;
  }

  // type-safe wrapper
  private postMessage(msg: CaptureWorkerRequest) {
    if (!this.worker) throw Error('worker is not set');
    this.worker.postMessage(msg);
  }

  private handleWorkerMessage(e: MessageEvent<CaptureWorkerResponse>) {
    const data = e.data;

    switch (data.type) {
      case 'init:done':
        this.awaitWorkerInitialization?.();
        this.awaitWorkerInitialization = null;
        const onLoad = this.onLoad;
        if (onLoad) {
          queueMicrotask(() => onLoad());
        }
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
        if (this.state === 'recording') {
          // recording일 때에만 onFrameDone 불러줌
          const result = data.result;
          const onFrameDone = this.onFrameDone;
          if (onFrameDone && result) {
            queueMicrotask(() => {
              onFrameDone(result.gemAttr, result.gems);
            });
          }
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
            if (this.state == 'recording') {
              this.debugCanvas.width = data.image.width;
              this.debugCanvas.height = data.image.height;
              this.debugCanvas.getContext('2d')?.drawImage(data.image, 0, 0);
            }
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
      this.track = stream.getVideoTracks()[0];
      const processor = new MediaStreamTrackProcessor({ track: this.track });
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
      value?.close();
      // worker의 opencv 및 어셋 로딩이 끝날 때까지 대기
      await waitForInit;

      // 프레임도 읽을 수 있고 worker도 준비가 끝난 경우 콜백
      const onReady = this.onReady;
      if (onReady) {
        queueMicrotask(() => {
          onReady();
        });
      }

      // 프레임 캡쳐 및 전송 loop로 이동
      started = true;
      this.state = 'recording';
      this.loop();
    } finally {
      // 시작에 실패했을 경우 다시 idle로
      if (!started) {
        this.state = 'idle';
      }
    }
  }

  private async loop() {
    // state가 recording이라면, reader로부터 프레임을 읽어서 worker에게 전달 및 결과를 기다린다.
    while (this.state == 'recording') {
      if (!this.reader) {
        throw Error('reader not exists');
      }
      let value: VideoFrame | undefined;
      try {
        if (!this.worker) throw Error('worker not exists');
        const result = await this.reader.read();
        value = result.value;
        const done = result.done;
        if (done) break; // 사용자가 화면 공유 중단시 여기서 break
        if (!value) break;

        // 분석이 끝나면 resolve되는 promise 생성
        const waitForAnalysis = new Promise<void>((resolve) => {
          this.awaitFrameCompletion = resolve;
        });
        // 현재 frame을 postMessage
        const start = performance.now();
        this.worker.postMessage({ type: 'frame', frame: value } satisfies CaptureWorkerRequest, [
          value,
        ]);
        value = undefined;
        // 주의: value 소유권은 worker에게 넘어갔으니 더 이상 건드리면 안 되기에 undefined
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
      } finally {
        // 모종의 사유로 value의 소유권이 넘어가지 않았으면 controller에서 종료
        value?.close();
      }
    }
    // loop가 탈출되면 idle로 설정
    this.track?.stop();
    this.track = null;
    const onStop = this.onStop;
    if (onStop) {
      queueMicrotask(() => {
        onStop();
      });
    }
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
  isIdle() {
    return this.state === 'idle';
  }
  isRecording() {
    return this.state == 'recording';
  }
}
