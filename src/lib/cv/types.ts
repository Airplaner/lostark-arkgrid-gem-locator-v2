import CV from '@techstark/opencv-js';

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
  | { type: 'frame:done'; result: any }
  | { type: 'error'; error: WorkerError }
  | { type: 'debug'; image?: ImageBitmap; message?: string };

export type WorkerError = {
  message: string;
  stack?: string;
  name?: string;
};
