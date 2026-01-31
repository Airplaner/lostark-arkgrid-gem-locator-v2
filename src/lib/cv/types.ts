import CV from '@techstark/opencv-js';

import type { ArkGridAttr } from '../constants/enums';
import type { ArkGridGem } from '../models/arkGridGems';
import type { AppLocale } from '../state/appConfig.state.svelte';

export type CvMat = CV.Mat;
export type CvRect = CV.Rect;
export type CvPoint = CV.Point;

// main → worker
export type CaptureWorkerRequest =
  | { type: 'init' } // init worker
  | { type: 'debug' } // turn on debug
  | { type: 'frame'; frame: VideoFrame } // send frame
  | { type: 'stop' };

// worker → main
export type CaptureWorkerResponse =
  | { type: 'init:done' }
  | {
      type: 'frame:done';
      result: {
        locale: AppLocale;
        gemAttr: ArkGridAttr;
        gems: ArkGridGem[];
      } | null;
    }
  | { type: 'error'; error: WorkerError }
  | { type: 'debug'; image?: ImageBitmap; message?: string };

export type WorkerError = {
  message: string;
  stack?: string;
  name?: string;
};
