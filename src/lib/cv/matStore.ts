/**
 * 스프라이트 이미지를 한 번 fetch → cv.Mat 생성
 */
import { type EnUsTemplateName, enUsCoords } from '../opencv-template-coords/en_us';
import { type KoKrTemplateName, koKrCoords } from '../opencv-template-coords/ko_kr';
import type { CvMat } from './types';

async function fetchSpriteMat(url: string): Promise<CvMat> {
  // url 이미지를 읽어온 뒤 Mat으로 변환
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');

  const img = await createImageBitmap(await fetch(url).then((r) => r.blob()));
  const off = document.createElement('canvas');
  off.width = img.width;
  off.height = img.height;
  const ctx = off.getContext('2d');
  if (!ctx) throw new Error('Canvas context creation failed');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const mat = cv.matFromImageData(data);
  cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
  img.close();
  return mat;
}

type GemTemplates = {
  ko_kr: Record<KoKrTemplateName, CvMat>;
  en_us: Record<EnUsTemplateName, CvMat>;
};
export async function loadGemTemplates(): Promise<GemTemplates> {
  const cv = window.cv;
  if (!cv) throw Error('cv is not ready');

  const result = {
    ko_kr: {} as any,
    en_us: {} as any,
  };

  const koSprite = await fetchSpriteMat(`${import.meta.env.BASE_URL}/opencv_template_ko_kr.png`);
  for (const [name, rect] of Object.entries(koKrCoords)) {
    result.ko_kr[name] = koSprite.roi(new cv.Rect(rect.x, rect.y, rect.w, rect.h));
  }
  koSprite.delete();

  const enSprite = await fetchSpriteMat(`${import.meta.env.BASE_URL}/opencv_template_en_us.png`);
  for (const [name, rect] of Object.entries(enUsCoords)) {
    result.en_us[name] = enSprite.roi(new cv.Rect(rect.x, rect.y, rect.w, rect.h));
  }
  enSprite.delete();

  return result;
}
