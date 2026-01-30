import { getCv, initOpenCv } from './cvRuntime';
import { showMatch } from './debug';
import { loadGemAsset } from './matStore';
import { getBestMatch } from './matcher';
import type { CaptureWorkerRequest, CaptureWorkerResponse, WorkerError } from './types';

class FrameProcessor {
  loadedAsset: Awaited<ReturnType<typeof loadGemAsset>> | null = null;
  debugCanvas: OffscreenCanvas | null = null;
  private canvas: OffscreenCanvas = new OffscreenCanvas(1, 1);
  private ctx = this.canvas.getContext('2d')!;
  constructor() {}

  async init() {
    await initOpenCv();
    this.loadedAsset = await loadGemAsset();
  }

  processFrame(frame: VideoFrame) {
    const rawFrame = frame;
    const canvas = this.canvas;
    const ctx = this.ctx;
    try {
      if (!this.loadedAsset) return;

      const cv = getCv();
      canvas.width = rawFrame.displayWidth;
      canvas.height = rawFrame.displayHeight;
      ctx.drawImage(rawFrame, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const frame = cv.matFromImageData(imageData);
      cv.cvtColor(frame, frame, cv.COLOR_RGBA2GRAY);

      const roiAnchor = new cv.Rect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
      const anchor = getBestMatch(frame, this.loadedAsset.atlasAnchor, roiAnchor);
      return { key: anchor.key, score: anchor.score };
      // ... 그 외 인식
      // return 인식된 객체들
    } catch (e) {
      throw e;
    } finally {
      rawFrame.close();
    }
  }
}

function postToMain(msg: CaptureWorkerResponse) {
  self.postMessage(msg);
}
const processor = new FrameProcessor(); // singleton

self.onmessage = async (e: MessageEvent<CaptureWorkerRequest>) => {
  const data = e.data;
  switch (data.type) {
    case 'init':
      await processor.init();
      postToMain({ type: 'init:done' });
      break;

    case 'debug':
      processor.debugCanvas = new OffscreenCanvas(0, 0);
      break;

    case 'frame':
      const result = processor.processFrame(data.frame);
      postToMain({
        type: 'frame:done',
        result,
        // result
      });
      if (processor.debugCanvas) {
        postToMain({
          type: 'debug',
          image: processor.debugCanvas.transferToImageBitmap(),
        });
      }
      break;
  }
};
