/**
 * 스프라이트 이미지를 한 번 fetch → cv.Mat 생성
 */
import { type ArkGridAttr, ArkGridAttrs } from '../constants/enums';
import { type ArkGridGemName, type ArkGridGemOptionType } from '../models/arkGridGems';
import { type EnUsTemplateName, enUsCoords } from '../opencv-template-coords/en_us';
import { type KoKrTemplateName, koKrCoords } from '../opencv-template-coords/ko_kr';
import { type AppLocale, supportedLocales } from '../state/appConfig.state.svelte';
import { type MatchingAtlas, generateMatchingAtlas } from './atlas';
import { getCv } from './cvRuntime';
import type { CvMat } from './types';

type KeyWillPower = '3' | '4' | '5' | '6' | '7' | '8' | '9';
type KeyCorePoint = '1' | '2' | '3' | '4' | '5';
type KeyOptionString = ArkGridGemOptionType;
type KeyOptionValue = '1' | '2' | '3' | '4' | '5';
type KeyGemAttr = ArkGridAttr;
type KeyGemName = ArkGridGemName;

async function fetchSpriteMat(url: string): Promise<CvMat> {
  // url 이미지를 읽어온 뒤 Mat으로 변환
  const cv = getCv();
  const img = await createImageBitmap(await fetch(url).then((r) => r.blob()));
  const off = new OffscreenCanvas(img.width, img.height);
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
async function loadGemTemplates(): Promise<GemTemplates> {
  const cv = getCv();
  // 각 언어별 sprite에서 이미지를 잘라온다.
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

export async function loadGemAsset() {
  const gt = await loadGemTemplates();

  const matAnchors = supportedLocales.reduce(
    (acc, locale) => {
      acc[locale] = gt[locale]['anchor.png'];
      return acc;
    },
    {} as Record<AppLocale, CvMat>
  );
  const atlasAnchor = generateMatchingAtlas(matAnchors);

  const atlasGemAttr = supportedLocales.reduce(
    (acc, locale) => {
      const mats = gt[locale];
      acc[locale] = generateMatchingAtlas({
        [ArkGridAttrs.Order]: mats['질서.png'],
        [ArkGridAttrs.Chaos]: mats['혼돈.png'],
      });
      return acc;
    },
    {} as Record<AppLocale, MatchingAtlas<ArkGridAttr>>
  );

  const atlasWillPower = supportedLocales.reduce(
    (acc, locale) => {
      const mats = gt[locale];
      acc[locale] = generateMatchingAtlas({
        3: mats['3.png'],
        4: mats['4.png'],
        5: mats['5.png'],
        6: mats['6.png'],
        7: mats['7.png'],
        8: mats['8.png'],
        9: mats['9.png'],
      });
      return acc;
    },
    {} as Record<AppLocale, MatchingAtlas<KeyWillPower>>
  );

  const atlasCorePoint = supportedLocales.reduce(
    (acc, locale) => {
      const mats = gt[locale];
      acc[locale] = generateMatchingAtlas({
        1: mats['1.png'],
        2: mats['2.png'],
        3: mats['3.png'],
        4: mats['4.png'],
        5: mats['5.png'],
      });
      return acc;
    },
    {} as Record<AppLocale, MatchingAtlas<KeyCorePoint>>
  );

  return { atlasAnchor, atlasGemAttr, atlasWillPower, atlasCorePoint };
}

// for (const targetLocale of supportedLocales) {
//   const mats = gt[targetLocale];
//   const matWillPower = {
//     3: mats['3.png'],
//     4: mats['4.png'],
//     5: mats['5.png'],
//     6: mats['6.png'],
//     7: mats['7.png'],
//     8: mats['8.png'],
//     9: mats['9.png'],
//   };
//   const matCorePoint = {
//     1: mats['1.png'],
//     2: mats['2.png'],
//     3: mats['3.png'],
//     4: mats['4.png'],
//     5: mats['5.png'],
//   };
//   const matOptionString = {
//     [ArkGridGemOptionTypes.ATTACK]: mats['공격력.png'],
//     [ArkGridGemOptionTypes.SKILL_DAMAGE]: mats['추가피해.png'],
//     [ArkGridGemOptionTypes.BOSS_DAMAGE]: mats['보스피해.png'],
//     [ArkGridGemOptionTypes.STIGMA]: mats['낙인력.png'],
//     [ArkGridGemOptionTypes.PARTY_ATTACK]: mats['아군공격강화.png'],
//     [ArkGridGemOptionTypes.PARTY_DAMAGE]: mats['아군피해강화.png'],
//   };
//   const matOptionValue = {
//     1: mats['lv1.png'],
//     2: mats['lv2.png'],
//     3: mats['lv3.png'],
//     4: mats['lv4.png'],
//     5: mats['lv5.png'],
//   };
//   const matGemAttr = {
//     [ArkGridAttrs.Order]: mats['질서.png'],
//     [ArkGridAttrs.Chaos]: mats['혼돈.png'],
//   };
//   const matGemImage = {
//     '질서의 젬 : 안정': mats['안정.png'],
//     '질서의 젬 : 견고': mats['견고.png'],
//     '질서의 젬 : 불변': mats['불변.png'],
//     '혼돈의 젬 : 침식': mats['침식.png'],
//     '혼돈의 젬 : 왜곡': mats['왜곡.png'],
//     '혼돈의 젬 : 붕괴': mats['붕괴.png'],
//   };

//   const { atlas, entries } = generateMatchingAtlas(matWillPower);
//   console.log(entries);
//   saveMatToFile(atlas, targetLocale + '-matWillpower.png');

//   globalLoadedAsset[targetLocale] = {
//     matAnchor,
//     matWillPower,
//     matCorePoint,
//     matOptionString,
//     matOptionValue,
//     matGemAttr,
//     matGemImage,
//   };
// }
// return globalLoadedAsset;
