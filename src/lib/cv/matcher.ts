import type { MinMaxLoc } from '@opencvjs/types/lib/opencv/_hacks';

import type { MatchingAtlas } from './atlas';
import type { CvMat } from './types';

export function getBestMatch<K extends string>(
  roiMat: CvMat,
  matchingAtlas: MatchingAtlas<K>,
  threshold: number
) {
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');
  const { atlas, entries } = matchingAtlas;
  const result = new cv.Mat();
  cv.matchTemplate(roiMat, atlas, result, cv.TM_CCOEFF_NORMED);

  let bestVal = 0;
  let bestKey: K | null = null;
  let bestMm: MinMaxLoc | null = null;

  for (const key of Object.keys(entries) as K[]) {
    const e = entries[key];
    const roi = result.roi(new cv.Rect(e.x, 0, e.width, result.rows));
    const mm = cv.minMaxLoc(roi);
    console.log(key, mm.maxVal);
    if (mm.maxVal >= threshold && mm.maxVal > bestVal) {
      bestVal = mm.maxVal;
      bestMm = mm;
      bestKey = key;
    }
    roi.delete();
  }
  if (!bestKey || !bestMm) return null;
  const bestEntry = entries[bestKey];
  return {
    key: bestKey,
    value: bestVal,
    loc: new cv.Rect(
      bestMm.maxLoc.x + bestEntry.x,
      bestMm.maxLoc.y,
      bestEntry.width,
      bestEntry.height
    ),
  };
}
