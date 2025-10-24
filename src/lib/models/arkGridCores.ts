import { ArkGridAttr, ArkGridGrade } from '../constants/enums';

export enum ArkGridCoreType {
  SUN = '해',
  MOON = '달',
  STAR = '별',
}

type ArkGridCoreCoeffs = {
  p10: number;
  p14: number;
  p17: number;
  p18: number;
  p19: number;
  p20: number;
};

export interface ArkGridCore {
  attr: ArkGridAttr;
  type: ArkGridCoreType;
  grade: ArkGridGrade;
  coeffs: ArkGridCoreCoeffs;
}

export function resetCoreCoeff(core: ArkGridCore) {
  core.coeffs = getDefaultCoreCoeff(core.attr, core.type);
  adjustCoeff(core);
}

function adjustCoeff(core: ArkGridCore) {
  // 코어 등급에 따라 계수 조정
  if (core.grade == ArkGridGrade.EPIC) {
    // 영웅 등급: 10P 옵션까지만 존재
    core.coeffs.p14 = core.coeffs.p10;
    core.coeffs.p17 = core.coeffs.p10;
    core.coeffs.p18 = core.coeffs.p10;
    core.coeffs.p19 = core.coeffs.p10;
    core.coeffs.p20 = core.coeffs.p10;
  } else if (core.grade == ArkGridGrade.LEGENDARY) {
    // 전설 등급 : 14P 옵션까지만 존재
    core.coeffs.p17 = core.coeffs.p14;
    core.coeffs.p18 = core.coeffs.p14;
    core.coeffs.p19 = core.coeffs.p14;
    core.coeffs.p20 = core.coeffs.p14;
  } else if (core.grade == ArkGridGrade.ANCIENT) {
    // 고대 등급 : 17-20P 옵션 계수 +100
    core.coeffs.p17 += 100;
    core.coeffs.p18 += 100;
    core.coeffs.p19 += 100;
    core.coeffs.p20 += 100;
  }
}

export function getDefaultCoreCoeff(attr: ArkGridAttr, type: ArkGridCoreType): ArkGridCoreCoeffs {
  if (attr == ArkGridAttr.Order) {
    if (type == ArkGridCoreType.SUN || type == ArkGridCoreType.MOON) {
      return {
        p10: 150,
        p14: 400,
        p17: 750,
        p18: 767,
        p19: 783,
        p20: 800,
      };
    } else if (type == ArkGridCoreType.STAR) {
      return {
        p10: 100,
        p14: 250,
        p17: 450,
        p18: 467,
        p19: 483,
        p20: 500,
      };
    }
  }
  return {
    p10: 0,
    p14: 0,
    p17: 0,
    p18: 0,
    p19: 0,
    p20: 0,
  };
}

export function createCore(
  attr: ArkGridAttr, type: ArkGridCoreType, grade: ArkGridGrade,
): ArkGridCore {
  const coeffs = getDefaultCoreCoeff(attr, type);
  const core: ArkGridCore = {attr, type, grade, coeffs};
  adjustCoeff(core);
  return core;
}
