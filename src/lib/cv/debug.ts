import type { MatchingResult } from './matcher';
import type { CvRect } from './types';

export function showMatch(
  debugCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  roi: CvRect,
  matchingResult: MatchingResult<string>,
  option?: {
    rectColor?: string;
    rectLineWidth?: number;
    fontColor?: string;
    fontSize?: number;
  }
) {
  // 디버깅용
  const rectLineWidth = option?.rectLineWidth ?? 1;
  debugCtx.lineWidth = rectLineWidth;

  // 1. roi 표시
  debugCtx.strokeStyle = 'white';
  debugCtx.strokeRect(roi.x, roi.y, roi.width, roi.height);

  // 탐지된 영역 표시
  const rect = {
    x: matchingResult.loc.x,
    y: matchingResult.loc.y,
    w: matchingResult.template.cols,
    h: matchingResult.template.rows,
  };
  debugCtx.strokeStyle = option?.rectColor ?? 'white';
  debugCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  const fontSize = option?.fontSize ?? 12;
  debugCtx.font = `${fontSize}px Arial`; // 폰트 설정
  debugCtx.fillStyle = option?.fontColor ?? 'white';
  debugCtx.textBaseline = 'top'; // y 기준을 rect.y로 맞춤
  debugCtx.fillText(matchingResult.key, roi.x + rectLineWidth, roi.y + rectLineWidth);
  debugCtx.fillText(
    matchingResult.score.toFixed(2),
    roi.x + rectLineWidth,
    roi.y + rectLineWidth + fontSize
  );
}
