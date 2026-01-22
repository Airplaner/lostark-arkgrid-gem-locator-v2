import {
  type ArkGridAttr,
  ArkGridAttrs,
  type LostArkGrade,
  LostArkGrades,
} from '../constants/enums';

export const ArkGridCoreTypes = {
  SUN: '해',
  MOON: '달',
  STAR: '별',
} as const;
export type ArkGridCoreType =
  (typeof ArkGridCoreTypes)[keyof typeof ArkGridCoreTypes];

export const ArkGridCoreNameTierMap: Record<string, number> = {
  '현란한 공격': 0,
  '안정적인 공격': 1,
  '재빠른 공격': 1,
  '불타는 일격': 0,
  '흡수의 일격': 1,
  '부수는 일격': 1,
  공격: 0,
  무기: 1, // 폿은 0
  '신념의 강화': 0,
  '흐르는 마나': 1,
  '불굴의 강화': 1,
  '낙인의 흔적': 0,
  '강철의 흔적': 1,
  '치명적인 흔적': 1,
};

export type ArkGridCoreCoeffs = {
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
  grade: LostArkGrade;
  coeffs: ArkGridCoreCoeffs;
  tier: number;
  /*
  딜러
  0: 현란, 불타
  1: 안정,재빠,흡수,부수
  2: 그 외

  서폿
  0: 신념, 낙인, 무기
  1: 흐마, 불굴, 강흔, 치흔
  2: 그 외
  */
}

export function resetCoreCoeff(core: ArkGridCore, isSupporter: boolean) {
  core.coeffs = getDefaultCoreCoeff(core, isSupporter);
  adjustCoeff(core, isSupporter);
}

function adjustCoeff(core: ArkGridCore, isSupporter: boolean) {
  // 코어 등급에 따라 계수 조정
  if (core.grade === LostArkGrades.EPIC) {
    // 영웅 등급: 10P 옵션까지만 존재
    core.coeffs.p14 = core.coeffs.p10;
    core.coeffs.p17 = core.coeffs.p10;
    core.coeffs.p18 = core.coeffs.p10;
    core.coeffs.p19 = core.coeffs.p10;
    core.coeffs.p20 = core.coeffs.p10;
  } else if (core.grade === LostArkGrades.LEGENDARY) {
    // 전설 등급 : 14P 옵션까지만 존재
    core.coeffs.p17 = core.coeffs.p14;
    core.coeffs.p18 = core.coeffs.p14;
    core.coeffs.p19 = core.coeffs.p14;
    core.coeffs.p20 = core.coeffs.p14;
  } else if (core.grade === LostArkGrades.ANCIENT && core.coeffs.p17) {
    /*
      고대 등급 17-20P 옵션 추가 계수
      딜러:  +100
      서폿
        - 질서의 해, 달: 120
        - 질서의 별: 90
        - 혼돈의 해, 달
          - 1티어: 180
          - 2티어: 120
    */
    let additionalCoeff = 100; // 딜러 100
    if (isSupporter) {
      switch (core.attr) {
        case ArkGridAttrs.Order:
          switch (core.type) {
            case ArkGridCoreTypes.SUN:
            case ArkGridCoreTypes.MOON:
              additionalCoeff = 120; // 폿 질서 해달  +120
              break;
            case ArkGridCoreTypes.STAR:
              additionalCoeff = 90; // 폿 질서 별 +90
              break;
            default:
              throw Error('additionalCoeff is not set');
          }
          break;
        case ArkGridAttrs.Chaos:
          switch (core.type) {
            case ArkGridCoreTypes.SUN: // 폿 혼돈 1티어 해달 +180
            case ArkGridCoreTypes.MOON: // 폿 혼돈 2티어 해달 +120
              additionalCoeff = core.tier == 0 ? 180 : 120;
              break;
            case ArkGridCoreTypes.STAR:
              additionalCoeff = 100; // 무기 +100 맞나?
              break;
            default:
              throw Error('additionalCoeff is not set');
          }
      }
    }
    core.coeffs.p17 += additionalCoeff;
    core.coeffs.p18 += additionalCoeff;
    core.coeffs.p19 += additionalCoeff;
    core.coeffs.p20 += additionalCoeff;
  }
}

export function getDefaultCoreCoeff(
  core: ArkGridCore,
  isSupporter = false
): ArkGridCoreCoeffs {
  const attr = core.attr,
    type = core.type,
    tier = core.tier;

  if (!isSupporter) {
    // 딜러
    if (attr == ArkGridAttrs.Order) {
      if (type == ArkGridCoreTypes.SUN || type == ArkGridCoreTypes.MOON) {
        // 질서의 해, 달
        return {
          p10: 150,
          p14: 400,
          p17: 750,
          p18: 767,
          p19: 783,
          p20: 800,
        };
      } else if (type == ArkGridCoreTypes.STAR) {
        // 질서의 별
        return {
          p10: 100,
          p14: 250,
          p17: 450,
          p18: 467,
          p19: 483,
          p20: 500,
        };
      }
    } else if (attr == ArkGridAttrs.Chaos) {
      if (type == ArkGridCoreTypes.SUN || type == ArkGridCoreTypes.MOON) {
        // 혼돈의 해, 달
        if (tier == 0) {
          // 현란한 공격, 불타는 일격
          return {
            p10: 50,
            p14: 100,
            p17: 250,
            p18: 267,
            p19: 283,
            p20: 300,
          };
        } else if (tier == 1) {
          // 안정적인 공격, 재빠른 공격, 흡수의 일격, 부수는 일격
          return {
            p10: 0,
            p14: 50,
            p17: 150,
            p18: 167,
            p19: 183,
            p20: 200,
          };
        }
      } else if (type == ArkGridCoreTypes.STAR) {
        // 혼돈의 별
        if (tier == 0) {
          // 공격
          return {
            p10: 50,
            p14: 100,
            p17: 250,
            p18: 267,
            p19: 283,
            p20: 300,
          };
        }
        if (tier == 1) {
          // 무기
          return {
            p10: 35,
            p14: 70,
            p17: 220,
            p18: 230,
            p19: 241,
            p20: 253,
          };
        }
      }
    }
  } else {
    // 서폿
    if (attr == ArkGridAttrs.Order) {
      if (type == ArkGridCoreTypes.SUN || type == ArkGridCoreTypes.MOON) {
        // 질서의 해, 달
        return {
          p10: 120,
          p14: 120,
          p17: 780,
          p18: 798,
          p19: 810,
          p20: 822,
        };
      } else if (type == ArkGridCoreTypes.STAR) {
        // 질서의 별
        return {
          p10: 0,
          p14: 60,
          p17: 210,
          p18: 220,
          p19: 230,
          p20: 240,
        };
      }
    } else if (attr == ArkGridAttrs.Chaos) {
      if (
        (type == ArkGridCoreTypes.SUN || type == ArkGridCoreTypes.MOON) &&
        tier == 0
      ) {
        // 혼돈의 해, 달
        // 1티어: 신념의 강화, 낙인의 흔적
        return {
          p10: 60,
          p14: 120,
          p17: 360,
          p18: 378,
          p19: 396,
          p20: 420,
        };
      } else if (tier == 1) {
        // 2티어
        if (type == ArkGridCoreTypes.SUN) {
          // 해 - 흐르는 마나, 불굴의 강화
          return {
            p10: 0,
            p14: 48,
            p17: 132,
            p18: 148,
            p19: 164,
            p20: 180,
          };
        } else if (type == ArkGridCoreTypes.MOON) {
          // 달 - 강철의 흔적, 치명적인 흔적
          return {
            p10: 60,
            p14: 60,
            p17: 180,
            p18: 180,
            p19: 180,
            p20: 180,
          };
        }
      } else if (type == ArkGridCoreTypes.STAR) {
        // 혼돈의 별
        if (tier == 0) {
          // 무기
          return {
            p10: 35,
            p14: 70,
            p17: 220,
            p18: 230,
            p19: 241,
            p20: 253,
          };
        }
      }
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

export function getDefaultCoreEnergy(
  core: ArkGridCore | undefined | null
): number {
  if (!core) return 0;
  switch (core.grade) {
    case LostArkGrades.EPIC:
      return 9;
    case LostArkGrades.LEGENDARY:
      return 12;
    case LostArkGrades.RELIC:
      return 15;
    case LostArkGrades.ANCIENT:
      return 17;
    default:
      return 0;
  }
}
export function getDefaultCoreGoalPoint(
  core: ArkGridCore | undefined | null
): number {
  if (!core) return 0;
  switch (core.grade) {
    case LostArkGrades.EPIC:
      return 10;
    case LostArkGrades.LEGENDARY:
      return 14;
    case LostArkGrades.RELIC:
      return 17;
    case LostArkGrades.ANCIENT:
      return 17;
    default:
      return 0;
  }
}
export function getMaxCorePoint(core: ArkGridCore | undefined | null): number {
  if (!core) return 0;
  switch (core.grade) {
    case LostArkGrades.EPIC:
      return 10;
    case LostArkGrades.LEGENDARY:
      return 14;
    case LostArkGrades.RELIC:
      return 20;
    case LostArkGrades.ANCIENT:
      return 20;
    default:
      return 0;
  }
}

export function createCore(
  attr: ArkGridAttr,
  type: ArkGridCoreType,
  grade: LostArkGrade,
  isSupporter: boolean,
  tier?: number
): ArkGridCore {
  const core: ArkGridCore = {
    attr,
    type,
    grade,
    coeffs: {
      p10: 0,
      p14: 0,
      p17: 0,
      p18: 0,
      p19: 0,
      p20: 0,
    },
    tier: tier ? tier : 0,
  };
  resetCoreCoeff(core, isSupporter);
  return core;
}

export const coreImages = import.meta.glob<string>('/src/assets/cores/*.png', {
  eager: true,
  import: 'default',
});

export function getCoreImage(attr: ArkGridAttr, ctype: ArkGridCoreType) {
  const attrMap = {
    [ArkGridAttrs.Order]: 'order',
    [ArkGridAttrs.Chaos]: 'chaos',
  };
  const typeMap = {
    [ArkGridCoreTypes.SUN]: 'sun',
    [ArkGridCoreTypes.MOON]: 'moon',
    [ArkGridCoreTypes.STAR]: 'star',
  };
  const key = `/src/assets/cores/${attrMap[attr]}_${typeMap[ctype]}.png`;
  return coreImages[key];
}
