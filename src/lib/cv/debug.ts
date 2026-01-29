import type { CvMat } from './types';

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
