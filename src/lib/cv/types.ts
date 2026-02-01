import CV from '@techstark/opencv-js';

import type { AppLocale, ArkGridAttr } from '../constants/enums';
import type { ArkGridGem } from '../models/arkGridGems';

export type CvMat = CV.Mat;
export type CvRect = CV.Rect;
export type CvPoint = CV.Point;

// main → worker
export type CaptureWorkerRequest =
  | { type: 'init' } // init worker
  | { type: 'frame'; frame: VideoFrame; drawDebug: boolean; detectionMargin: number } // send frame
  | { type: 'stop' };

// worker → main
export type CaptureWorkerResponse =
  | { type: 'init:done' }
  | { type: 'init:error' }
  | {
      type: 'frame:done';
      result:
        | {
            locale: AppLocale;
            gemAttr: ArkGridAttr;
            gems: ArkGridGem[];
          }
        | undefined;
    }
  | { type: 'error'; error: WorkerError }
  | { type: 'debug'; image?: ImageBitmap; message?: string };

export type WorkerError = {
  message: string;
  stack?: string;
  name?: string;
};
