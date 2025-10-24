import { ArkGridAttr, ArkGridGrade } from '../constants/enums';

export enum ArkGridCoreType {
  SUN = '해',
  MOON = '달',
  STAR = '별',
}

export interface ArkGridCore {
  attr: ArkGridAttr;
  type: ArkGridCoreType;
  grade: ArkGridGrade;
  coeff: Array<number>;
}

function getFullCoeff(p10: number, p14: number, p17: number, grade: ArkGridGrade): Array<number> {
  // 0p-9p는 모두 0
  const coeff = Array(10).fill(0);
  // 10p-13p는 10p 값 기준
  for (let i = 0; i < 4; i++) coeff.push(p10);
  // 14p-16p는 14p 값 기준
  for (let i = 0; i < 3; i++) coeff.push(p14);
  // 고대라면 17p에 +100
  if (grade == ArkGridGrade.ANCIENT) p17 += 100;
  coeff.push(p17);
  coeff.push(p17 + 17);
  coeff.push(p17 + 33);
  coeff.push(p17 + 50);

  // 영웅이라면 14p 이상 값 평탄화
  if (grade == ArkGridGrade.EPIC) {
    for (let i = 14; i <= 20; i++) {
      coeff[i] = coeff[10];
    }
  }

  // 전설이라면 17p 이상 값 평탄화
  else if (grade == ArkGridGrade.LEGENDARY) {
    for (let i = 17; i <= 20; i++) {
      coeff[i] = coeff[14];
    }
  }
  return coeff;
}

export function getDefaultCoreCoeff(
  attr: ArkGridAttr,
  type: ArkGridCoreType,
  grade: ArkGridGrade
): Array<number> {
  if (attr == ArkGridAttr.Order) {
    if (type == ArkGridCoreType.SUN || type == ArkGridCoreType.MOON) {
      return getFullCoeff(150, 400, 750, grade);
    } else if (type == ArkGridCoreType.STAR) {
      return getFullCoeff(100, 250, 450, grade);
    }
  }
  return [];
}

export function createCore(
  attr: ArkGridAttr,
  type: ArkGridCoreType,
  grade: ArkGridGrade
): ArkGridCore {
  return {
    attr,
    type,
    grade,
    coeff: getDefaultCoreCoeff(attr, type, grade),
  };
}
