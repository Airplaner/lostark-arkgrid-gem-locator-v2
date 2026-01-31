import type { CV } from '@techstark/opencv-js';

import { type ArkGridGem, determineGemGrade, determineGemGradeByGem } from '../models/arkGridGems';
import type { AppLocale } from '../state/appConfig.state.svelte';
import type { MatchingAtlas } from './atlas';
import { getCv, initOpenCv } from './cvRuntime';
import { showMatch } from './debug';
import {
  type KeyCorePoint,
  type KeyGemAttr,
  type KeyGemName,
  type KeyOptionLevel,
  type KeyOptionString,
  type KeyWillPower,
  loadGemAsset,
} from './matStore';
import { type MatchingResult, getBestMatch } from './matcher';
import type { CaptureWorkerRequest, CaptureWorkerResponse, CvMat } from './types';

type RecgonitionTarget<K extends string> = {
  roi: {
    // 전체 frame에서 탐색 대상 roi
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // 사용할 atlas
  atlas: MatchingAtlas<K>;
  threshold: number;
};

class FrameProcessor {
  loadedAsset: Awaited<ReturnType<typeof loadGemAsset>> | null = null;
  debugCanvas: OffscreenCanvas | null = null;
  private canvas: OffscreenCanvas = new OffscreenCanvas(1, 1);
  private ctx = this.canvas.getContext('2d')!;
  private initPromise: Promise<void> | null = null;
  private cv: CV | null = null;
  thresholdSet = {
    anchor: 0.95,
    gemAttr: 0.9,
    gemImage: 0.8,
    willPower: 0.8,
    corePoint: 0.8,
    default: 0.8,
  };
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
      this.cv = getCv();
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

  findBest<K extends string>(
    t: RecgonitionTarget<K>,
    frame: CvMat,
    debugCtx?: OffscreenCanvasRenderingContext2D | null
  ): MatchingResult<K> | null {
    // 주어진 target을 찾고
    if (!this.cv) throw Error('cv is not ready');
    const roi = new this.cv.Rect(t.roi.x, t.roi.y, t.roi.width, t.roi.height);
    const match = getBestMatch(frame, t.atlas, roi);
    if (!match) return null;
    if (debugCtx) {
      showMatch(debugCtx, roi, match, {
        scoreThreshold: t.threshold,
      });
    }
    if (match.score > t.threshold) return match;
    return null;
  }

  processFrame(frame: VideoFrame) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    let resizedFrame: CvMat | null = null;
    let debugCtx: OffscreenCanvasRenderingContext2D | null = null;
    const cv = this.cv;

    try {
      if (!this.loadedAsset) return;
      const { resolutionScale, expectedResolution } = this.adjustResolution(frame.displayHeight);
      canvas.width = frame.displayWidth * resolutionScale;
      canvas.height = frame.displayHeight * resolutionScale;
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resizedFrame = cv.matFromImageData(imageData);
      cv.cvtColor(resizedFrame, resizedFrame, cv.COLOR_RGBA2GRAY);
      if (this.debugCanvas) {
        this.debugCanvas.width = frame.displayWidth * resolutionScale;
        this.debugCanvas.height = frame.displayHeight * resolutionScale;

        debugCtx = this.debugCanvas.getContext('2d');
        if (debugCtx) {
          debugCtx?.drawImage(frame, 0, 0, this.debugCanvas.width, this.debugCanvas.height);
          debugCtx.font = `40px Arial`;
          debugCtx.fillStyle = 'white';
          debugCtx.strokeStyle = 'black'; // 테두리 색
          debugCtx.lineWidth = 10 * resolutionScale; // 테두리 두께
          const x = 25;
          const y = 100;
          // 테두리 먼저 그리기
          debugCtx.strokeText(
            `해상도: ${expectedResolution} (${frame.displayWidth}x${frame.displayHeight})`,
            x,
            y
          );
          // 그 위에 흰 글씨 채우기
          debugCtx.fillText(
            `해상도: ${expectedResolution} (${frame.displayWidth}x${frame.displayHeight})`,
            x,
            y
          );
        }
      }

      // 1. anchor 찾기
      const anchor = this.findBest<AppLocale>(
        {
          roi: { x: canvas.width / 2, y: 36, width: canvas.width / 2, height: canvas.height / 2 },
          atlas: this.loadedAsset.atlasAnchor,
          threshold: this.thresholdSet.anchor,
        },
        resizedFrame,
        debugCtx
      );
      if (!anchor) return;
      const currentLocale = anchor.key;
      const anchorX = anchor.loc.x - 297;
      const anchorY = anchor.loc.y;

      //2
      const gemAttr = this.findBest<KeyGemAttr>(
        {
          roi: { x: anchorX + 111, y: anchorY + 91, width: 224, height: 24 },
          atlas: this.loadedAsset.atlasGemAttr[currentLocale],
          threshold: this.thresholdSet.anchor,
        },
        resizedFrame,
        debugCtx
      );
      if (!gemAttr) return;

      // 5. 9개의 젬을 찾아서 이미지 매칭
      const currentGems: ArkGridGem[] = [];
      for (let i = 0; i < 9; i++) {
        // 젬 row의 위치 계산 (높이 61픽셀, gap 2픽셀)
        const rowX = anchorX + 10;
        const rowY = anchorY + 213 + 63 * i;

        // 1) 젬 종류 (이름)
        const gemName = this.findBest<KeyGemName>(
          {
            roi: { x: rowX + 9, y: rowY + 14, width: 30, height: 30 },
            atlas: this.loadedAsset.altasGemImage[currentLocale],
            threshold: this.thresholdSet.gemImage,
          },
          resizedFrame,
          debugCtx
        );

        // 2) 의지력
        const willPower = this.findBest<KeyWillPower>(
          {
            roi: { x: rowX + 65, y: rowY, width: 18, height: 30 },
            atlas: this.loadedAsset.atlasWillPower[currentLocale],
            threshold: this.thresholdSet.willPower,
          },
          resizedFrame,
          debugCtx
        );

        // 3) 질서/혼돈 포인트
        const corePoint = this.findBest<KeyCorePoint>(
          {
            roi: { x: rowX + 65, y: rowY + 30, width: 18, height: 30 },
            atlas: this.loadedAsset.atlasCorePoint[currentLocale],
            threshold: this.thresholdSet.corePoint,
          },
          resizedFrame,
          debugCtx
        );

        // 4) 윗 옵션
        const optionAName = this.findBest<KeyOptionString>(
          {
            roi: {
              x: rowX + 125,
              y: rowY,
              width: 146,
              height: 30,
            },
            atlas: this.loadedAsset.atalsOptionString[currentLocale],
            threshold: this.thresholdSet.default,
          },
          resizedFrame,
          debugCtx
        );
        const optionALevelXOffset = optionAName
          ? optionAName.loc.x - (rowX + 125) + optionAName.template.cols + 16
          : 60;

        const optionALevel = this.findBest<KeyOptionLevel>(
          {
            roi: {
              x: rowX + 125 + optionALevelXOffset,
              y: rowY,
              width: 48,
              height: 30,
            },
            atlas: this.loadedAsset.atalsOptionLevel[currentLocale],
            threshold: this.thresholdSet.default,
          },
          resizedFrame,
          debugCtx
        );

        // 5) 아랫 옵션
        const optionBName = this.findBest<KeyOptionString>(
          {
            roi: {
              x: rowX + 125,
              y: rowY + 30,
              width: 146,
              height: 30,
            },
            atlas: this.loadedAsset.atalsOptionString[currentLocale],
            threshold: this.thresholdSet.default,
          },
          resizedFrame,
          debugCtx
        );
        const optionBLevelXOffset = optionBName
          ? optionBName.loc.x - (rowX + 125) + optionBName.template.cols + 16
          : 60;

        const optionBLevel = this.findBest<KeyOptionLevel>(
          {
            roi: {
              x: rowX + 125 + optionBLevelXOffset,
              y: rowY + 30,
              width: 48,
              height: 30,
            },
            atlas: this.loadedAsset.atalsOptionLevel[currentLocale],
            threshold: this.thresholdSet.default,
          },
          resizedFrame,
          debugCtx
        );

        if (
          gemName !== null &&
          willPower !== null &&
          corePoint !== null &&
          optionAName !== null &&
          optionALevel !== null &&
          optionBName !== null &&
          optionBLevel !== null
        ) {
          const gem: ArkGridGem = {
            gemAttr: gemAttr.key,
            name: gemName.key,
            req: Number(willPower.key),
            point: Number(corePoint.key),
            option1: {
              optionType: optionAName.key,
              value: Number(optionALevel.key),
            },
            option2: {
              optionType: optionBName.key,
              value: Number(optionBLevel.key),
            },
          };
          determineGemGradeByGem(gem);
          currentGems.push(gem);
        }
      }
      return { locale: currentLocale, gemAttr: gemAttr.key, gems: currentGems };
      // ... 그 외 인식
      // return 인식된 객체들
    } finally {
      if (resizedFrame) resizedFrame.delete();
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
        gems: result,
      });
      break;
  }
};
