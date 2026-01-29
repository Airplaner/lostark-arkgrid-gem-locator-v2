import type { MatchingResult } from './matcher';
import type { CvMat, CvRect } from './types';

export function saveMatToFile(mat: CvMat, filename: string = 'debug.png') {
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');
  // 임시 canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;

  // Mat → Canvas
  cv.imshow(canvas, mat);

  // Canvas → 파일
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
export function getDebugAtlasContainer(): HTMLDivElement {
  // 디버그용으로 쓸 div를 debug-atlas라는 이름으로 만들고, style을 우측 상단에 박혀있도록 설정
  let el = document.getElementById('debug-atlas') as HTMLDivElement;

  if (!el) {
    el = document.createElement('div');
    el.id = 'debug-atlas';

    Object.assign(el.style, {
      position: 'fixed',
      right: '0',
      top: '0',
      maxHeight: '100vh',
      overflowY: 'auto',
      background: '#111',
      padding: '8px',
      zIndex: '99999',
      fontFamily: 'monospace',
    });

    document.body.appendChild(el);
  }

  return el;
}
export function appendMatToDebug(mat: CvMat, label?: string) {
  // 디버그용 atlas container에다가 주어진 CvMat을 그린다.
  // title도 달아줌
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');
  const container = getDebugAtlasContainer();

  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '8px';

  if (label) {
    const title = document.createElement('div');
    title.textContent = label;
    title.style.color = '#0f0';
    title.style.fontSize = '12px';
    wrapper.appendChild(title);
  }

  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;

  // grayscale면 RGBA로
  if (mat.channels() === 1) {
    const tmp = new cv.Mat();
    cv.cvtColor(mat, tmp, cv.COLOR_GRAY2RGBA);
    cv.imshow(canvas, tmp);
    tmp.delete();
  } else {
    cv.imshow(canvas, mat);
  }

  canvas.style.border = '1px solid #333';
  canvas.style.display = 'block';

  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

export function showMatch(
  debugCtx: CanvasRenderingContext2D,
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
