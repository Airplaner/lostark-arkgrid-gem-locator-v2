import type { CaptureWorkerRequest, CaptureWorkerResponse } from './types';

export class CaptureController {
  state: 'idle' | 'loading' | 'ready' | 'recording' = 'idle';
  reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
  worker: Worker | null = null;
  debugCtx: CanvasRenderingContext2D | null;

  // 👇 기다리는 Promise들의 resolver
  private initResolver: (() => void) | null = null;
  private frameResolver: (() => void) | null = null;

  constructor(debugCtx: CanvasRenderingContext2D | null = null) {
    this.debugCtx = debugCtx;
    console.log('debug ctx is set!', debugCtx);
  }

  postMessage(msg: CaptureWorkerRequest) {
    if (!this.worker) throw Error('worker is not set');
    this.worker.postMessage(msg);
  }

  private handleWorkerMessage(e: MessageEvent<CaptureWorkerResponse>) {
    const data = e.data;
    console.log('message come', e.data);

    switch (data.type) {
      case 'init:done':
        this.initResolver?.();
        this.initResolver = null;
        break;

      case 'frame:done':
        this.frameResolver?.();
        this.frameResolver = null;
        console.log('분석 완료!', data.result);
        break;

      case 'error':
        console.error('Worker error:', data.error);
        this.initResolver?.();
        this.initResolver = null;
        break;

      case 'debug':
        try {
          this.debugCtx?.drawImage(data.image, 0, 0);
        } catch (err) {
          console.error(err);
        } finally {
          data.image.close();
        }
        this.frameResolver?.();
        this.frameResolver = null;
    }
  }

  private async requestDisplayMedia() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
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
    this.state = 'loading';
    if (!this.worker) {
      this.worker = new Worker(new URL('./captureWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }
    const waitForInit = new Promise<void>((resolve) => {
      this.initResolver = resolve;
    });
    this.postMessage({ type: 'init' });
    if (debugMode) {
      this.postMessage({ type: 'debug' } satisfies CaptureWorkerRequest);
    }
    await this.requestDisplayMedia();

    if (!this.reader) {
      throw Error('reader is not ready');
    }
    const { value, done } = await this.reader.read();
    if (done) {
      throw Error('Failed to read even a frame');
    }
    await waitForInit;
    console.log('init done!');
    this.state = 'recording';
    this.loop();
  }

  async loop() {
    console.log('loop start!');
    while (this.state == 'recording') {
      if (!this.reader) return;
      const { value, done } = await this.reader.read();
      if (done) return;
      if (!this.worker) return;
      const waitForAnalysis = new Promise<void>((resolve) => {
        this.frameResolver = resolve;
      });
      this.worker.postMessage({ type: 'frame', frame: value } satisfies CaptureWorkerRequest, [
        value,
      ]); // value 소유권은 worker에게 넘어갔으니 더 이상 건드리면 안 됨
      await waitForAnalysis;
    }
  }
}
