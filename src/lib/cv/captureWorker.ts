import { getCv, initOpenCv } from './cvRuntime';
import { showMatch } from './debug';
import { loadGemAsset } from './matStore';
import { type MatchingResult, getBestMatch, getBestMatchAtlas } from './matcher';
import type { CaptureWorkerRequest, CaptureWorkerResponse, CvRect, WorkerError } from './types';

class FrameProcessor {
  loadedAsset: Awaited<ReturnType<typeof loadGemAsset>> | null = null;
  debugCanvas: OffscreenCanvas | null = null;
  private canvas: OffscreenCanvas = new OffscreenCanvas(1, 1);
  private ctx = this.canvas.getContext('2d')!;
  private initPromise: Promise<void> | null = null;
  constructor() {}

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }
    // Q. 두 개의 흐름이 동시에 여기 도착하면?
    // A. JS/Worker는 단일 스레드이며,
    //    첫 await 이전의 동기 코드는 중단되지 않고 원자적으로 실행된다
    this.initPromise = (async () => {
      await initOpenCv();
      if (!this.loadedAsset) {
        this.loadedAsset = await loadGemAsset();
      }
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  adjustResolution(height: number) {
    let resolutionScale = 1;
    let expectedResolution = 'FHD';
    // 윈도우 타이틀 바 높이는 32px정도라고 함
    if (height < 1080) {
      // FHD 미만인 경우, FHD로 늘림
      resolutionScale = 1080 / (height - 27); // 윈도우 10 기준 실제로 27px
      expectedResolution = `(경고) FHD 미만`;
    } else if (height >= 1080 && height <= 1080 + 48) {
      // FHD, UWFHD의 경우 그대로 사용
    } else if (height >= 1440 && height <= 1440 + 48) {
      // QHD, UWQHD의 경우 해상도 3/4배
      resolutionScale = 3 / 4;
      expectedResolution = 'QHD';
    } else if (height >= 2160 && height <= 2160 + 48) {
      // UHD의 경우 해상도 1/2배
      resolutionScale = 1 / 2;
      expectedResolution = 'UHD';
    } else {
      // ? FHD 그대로 사용
      expectedResolution = '(경고) Unknown';
    }
    return {
      resolutionScale,
      expectedResolution,
    };
  }

  processFrame(frame: VideoFrame) {
    const detectionThreshold = 0.7;
    const canvas = this.canvas;
    const ctx = this.ctx;
    let debugCtx: OffscreenCanvasRenderingContext2D | null = null;
    try {
      if (!this.loadedAsset) return;

      const cv = getCv();
      const { resolutionScale, expectedResolution } = this.adjustResolution(frame.displayHeight);
      canvas.width = frame.displayWidth * resolutionScale;
      canvas.height = frame.displayHeight * resolutionScale;
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const resizedFrame = cv.matFromImageData(imageData);
      cv.cvtColor(resizedFrame, resizedFrame, cv.COLOR_RGBA2GRAY);
      if (this.debugCanvas) {
        this.debugCanvas.width = frame.displayWidth * resolutionScale;
        this.debugCanvas.height = frame.displayHeight * resolutionScale;

        debugCtx = this.debugCanvas?.getContext('2d');
        debugCtx?.drawImage(frame, 0, 0, this.debugCanvas.width, this.debugCanvas.height);
      }

      const roiAnchor = new cv.Rect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);

      // 1
      const anchor = getBestMatch(resizedFrame, this.loadedAsset.atlasAnchor, roiAnchor);

      if (debugCtx) {
        showMatch(debugCtx, roiAnchor, anchor, {
          scoreThreshold: detectionThreshold,
        });
      }
      const currentLocale = anchor.key;
      const anchorX = anchor.loc.x;
      const anchorY = anchor.loc.y;

      //2
      const roiGemAttr = new cv.Rect(anchorX + 111, anchorY + 91, 224, 24);
      const gemAttr = getBestMatch(
        resizedFrame,
        this.loadedAsset.atlasGemAttr[currentLocale],
        roiGemAttr
      );
      if (debugCtx) {
        showMatch(debugCtx, roiGemAttr, gemAttr, {
          scoreThreshold: detectionThreshold,
        });
      }
      //3

      // 5. 9개의 젬을 찾아서 이미지 매칭
      const currentGems: string[] = [];
      for (let i = 0; i < 9; i++) {
        // 젬 row의 위치 계산 (높이 63픽셀)
        const roiGemRow = new cv.Rect(
          anchorX + (1176 - 1166),
          anchorY + (331 - 118) + (394 - 331) * i,
          410,
          60
        );

        const roiGemImage = new cv.Rect(
          roiGemRow.x + 1198 - 1176,
          roiGemRow.y + 347 - 331,
          1212 - 1198,
          375 - 347
        );
        const gemImage = getBestMatch(
          resizedFrame,
          this.loadedAsset.altasGemImage[currentLocale],
          roiGemImage
        );
        currentGems.push(gemImage.key);
        if (debugCtx) {
          showMatch(debugCtx, roiGemImage, gemImage, {
            scoreThreshold: detectionThreshold,
          });
        }
      }

      resizedFrame.delete();
      return { locale: currentLocale, gemAttr: gemAttr.key, gems: currentGems };
      // ... 그 외 인식
      // return 인식된 객체들
    } finally {
      frame.close();
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
      if (processor.debugCanvas) {
        postToMain({
          type: 'debug',
          image: processor.debugCanvas.transferToImageBitmap(),
        });
      }
      postToMain({
        type: 'frame:done',
        result,
      });
      break;
  }
};
