import {
  type ArkGridAttr,
  type LostArkGrade,
  LostArkGrades,
} from '../constants/enums';

export const ArkGridGemOptionTypes = {
  ATTACK: '공격력',
  BOSS_DAMAGE: '보스 피해',
  SKILL_DAMAGE: '추가 피해',
  STIGMA: '낙인력',
  PARTY_ATTACK: '아군 공격 강화',
  PARTY_DAMAGE: '아군 피해 강화',
} as const;
export type ArkGridGemOptionType =
  (typeof ArkGridGemOptionTypes)[keyof typeof ArkGridGemOptionTypes];

export const ArkGridGemNames = [
  '질서의 젬 : 안정',
  '질서의 젬 : 견고',
  '질서의 젬 : 불변',
  '혼돈의 젬 : 침식',
  '혼돈의 젬 : 왜곡',
  '혼돈의 젬 : 붕괴',
];

export type ArkGridGemOption = {
  optionType: ArkGridGemOptionType;
  value: number;
};

export interface ArkGridGem {
  name?: string;
  grade?: LostArkGrade;
  gemAttr: ArkGridAttr;
  req: number;
  point: number;
  option1: ArkGridGemOption;
  option2: ArkGridGemOption;
  assign?: number;
}

export function determineGemGrade(
  req: number,
  point: number,
  option1: ArkGridGemOption,
  option2: ArkGridGemOption,
  name?: string
) {
  let basePoint = 8;
  if (name === '질서의 젬 : 견고' || name === '혼돈의 젬 : 왜곡') {
    basePoint = 9;
  } else if (name === '질서의 젬 : 불변' || name === '혼돈의 젬 : 붕괴') {
    basePoint = 10;
  }
  const totalPoint = basePoint - req + point + option1.value + option2.value;
  return totalPoint < 16
    ? LostArkGrades.LEGENDARY
    : totalPoint < 19
      ? LostArkGrades.RELIC
      : LostArkGrades.ANCIENT;
}

export function isSameArkGridGem(
  a: ArkGridGem | undefined,
  b: ArkGridGem | undefined
): boolean {
  if (a === undefined || b === undefined) return false;
  return (
    a.gemAttr === b.gemAttr &&
    a.req === b.req &&
    a.point === b.point &&
    isSameOption(a.option1, b.option1) &&
    isSameOption(a.option2, b.option2)
  );
}

function isSameOption(a: ArkGridGemOption, b: ArkGridGemOption): boolean {
  return a.optionType === b.optionType && a.value === b.value;
}
