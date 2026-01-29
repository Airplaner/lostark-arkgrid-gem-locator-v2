import type { MinMaxLoc } from '@opencvjs/types/lib/opencv/_hacks';

import type { MatchingAtlas } from './atlas';
import type { CvMat, CvPoint, CvRect } from './types';

export type MatchingResult<K extends string> = {
  key: K;
  score: number;
  loc: CvPoint;
  template: CvMat;
};

export function getBestMatchAtlas<K extends string>(
  roiMat: CvMat,
  matchingAtlas: MatchingAtlas<K>,
  threshold: number
): MatchingResult<K> | null {
  if (roiMat.cols > matchingAtlas.atlas.cols || roiMat.rows > matchingAtlas.atlas.rows) {
    throw Error(
      `Input matrix(${roiMat.cols}x${roiMat.rows}) is larger than atlas(${matchingAtlas.atlas.cols}x${matchingAtlas.atlas.rows})`
    );
  }
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');
  const { atlas, entries } = matchingAtlas;
  const result = new cv.Mat();
  cv.matchTemplate(roiMat, atlas, result, cv.TM_CCOEFF_NORMED);
  const mm = cv.minMaxLoc(result);
  if (mm.maxVal < threshold) return null;
  for (const key of Object.keys(matchingAtlas.entries) as K[]) {
    const e = matchingAtlas.entries[key];
    if (mm.maxLoc.x > e.x && mm.maxLoc.x < e.x + e.width) {
      return {
        key,
        score: mm.maxVal,
        loc: mm.maxLoc,
        template: e.template,
      };
    }
  }
  return null;
}

export function getBestMatch<K extends string>(
  frame: CvMat,
  matchingAtlas: MatchingAtlas<K>,
  roi?: CvRect
): MatchingResult<K> {
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');

  const targetFrame = roi ? frame.roi(roi) : frame;

  let bestMm: MinMaxLoc | null = null;
  let bestKey: K | null = null;

  for (const key of Object.keys(matchingAtlas.entries) as K[]) {
    const template = matchingAtlas.entries[key].template;
    const result = new cv.Mat();
    cv.matchTemplate(targetFrame, template, result, cv.TM_CCOEFF_NORMED);
    const mm = cv.minMaxLoc(result);
    if (!bestMm || mm.maxVal > bestMm.maxVal) {
      bestMm = mm;
      bestKey = key;
    }
    result.delete();
  }

  if (roi) targetFrame.delete();

  if (!bestMm || !bestKey) throw Error('matchingAtlas is empty');

  return {
    key: bestKey,
    score: bestMm.maxVal,
    loc: new cv.Point(
      roi ? roi.x + bestMm.maxLoc.x : bestMm.maxLoc.x,
      roi ? roi.y + bestMm.maxLoc.y : bestMm.maxLoc.y
    ),
    template: matchingAtlas.entries[bestKey].template,
  };
}

export function findLocation(frame: CvMat, template: CvMat, roi?: CvRect) {
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');

  const targetFrame = roi ? frame.roi(roi) : frame;

  const result = new cv.Mat();
  cv.matchTemplate(targetFrame, template, result, cv.TM_CCOEFF_NORMED);
  const mm = cv.minMaxLoc(result);
  if (roi) targetFrame.delete();

  return {
    key: '',
    score: mm.maxVal,
    loc: new cv.Point(
      roi ? roi.x + mm.maxLoc.x : mm.maxLoc.x,
      roi ? roi.y + mm.maxLoc.y : mm.maxLoc.y
    ),
    template: template,
  };
}
