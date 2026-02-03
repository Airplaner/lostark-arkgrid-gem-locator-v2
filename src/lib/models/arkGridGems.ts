import {
  type AppLocale,
  type ArkGridAttr,
  ArkGridAttrs,
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

export type ArkGridGemSpec = {
  attr: ArkGridAttr;
  name: Record<AppLocale, string>;
  req: Number;
  availableOptions: ArkGridGemOptionType[];
};
export const ArkGridGemSpecs = {
  '질서의 젬 : 안정': {
    attr: ArkGridAttrs.Order,
    name: {
      ko_kr: '질서의 젬 : 안정',
      en_us: 'Order Astrogem: Stability',
    },
    req: 8,
    availableOptions: [
      ArkGridGemOptionTypes.ATTACK,
      ArkGridGemOptionTypes.SKILL_DAMAGE,
      ArkGridGemOptionTypes.STIGMA,
      ArkGridGemOptionTypes.PARTY_DAMAGE,
    ],
  },
  '질서의 젬 : 견고': {
    attr: ArkGridAttrs.Order,
    name: {
      ko_kr: '질서의 젬 : 견고',
      en_us: 'Order Astrogem: Solidity',
    },
    req: 9,
    availableOptions: [
      ArkGridGemOptionTypes.ATTACK,
      ArkGridGemOptionTypes.BOSS_DAMAGE,
      ArkGridGemOptionTypes.PARTY_DAMAGE,
      ArkGridGemOptionTypes.PARTY_ATTACK,
    ],
  },
  '질서의 젬 : 불변': {
    attr: ArkGridAttrs.Order,
    name: {
      ko_kr: '질서의 젬 : 불변',
      en_us: 'Order Astrogem: Immutability',
    },
    req: 10,
    availableOptions: [
      ArkGridGemOptionTypes.SKILL_DAMAGE,
      ArkGridGemOptionTypes.BOSS_DAMAGE,
      ArkGridGemOptionTypes.STIGMA,
      ArkGridGemOptionTypes.PARTY_ATTACK,
    ],
  },
  '혼돈의 젬 : 침식': {
    attr: ArkGridAttrs.Chaos,
    name: {
      ko_kr: '혼돈의 젬 : 침식',
      en_us: 'Chaos Astrogem: Corrosion',
    },
    req: 8,
    availableOptions: [
      ArkGridGemOptionTypes.ATTACK,
      ArkGridGemOptionTypes.SKILL_DAMAGE,
      ArkGridGemOptionTypes.STIGMA,
      ArkGridGemOptionTypes.PARTY_DAMAGE,
    ],
  },
  '혼돈의 젬 : 왜곡': {
    attr: ArkGridAttrs.Chaos,
    name: {
      ko_kr: '혼돈의 젬 : 왜곡',
      en_us: 'Chaos Astrogem: Distortion',
    },
    req: 9,
    availableOptions: [
      ArkGridGemOptionTypes.ATTACK,
      ArkGridGemOptionTypes.BOSS_DAMAGE,
      ArkGridGemOptionTypes.PARTY_DAMAGE,
      ArkGridGemOptionTypes.PARTY_ATTACK,
    ],
  },
  '혼돈의 젬 : 붕괴': {
    attr: ArkGridAttrs.Chaos,
    name: {
      ko_kr: '혼돈의 젬 : 붕괴',
      en_us: 'Chaos Astrogem: Destruction',
    },
    req: 10,
    availableOptions: [
      ArkGridGemOptionTypes.SKILL_DAMAGE,
      ArkGridGemOptionTypes.BOSS_DAMAGE,
      ArkGridGemOptionTypes.STIGMA,
      ArkGridGemOptionTypes.PARTY_ATTACK,
    ],
  },
} as const satisfies Record<string, ArkGridGemSpec>;
export type ArkGridGemName = keyof typeof ArkGridGemSpecs;
export const ArkGridGemNames = Object.keys(ArkGridGemSpecs) as ArkGridGemName[];

export type ArkGridGemOption = {
  optionType: ArkGridGemOptionType;
  value: number;
};

export interface ArkGridGem {
  name?: ArkGridGemName;
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
  name?: ArkGridGemName
) {
  let basePoint = name ? ArkGridGemSpecs[name].req : 8;
  const totalPoint = basePoint - req + point + option1.value + option2.value;
  return totalPoint < 16
    ? LostArkGrades.LEGENDARY
    : totalPoint < 19
      ? LostArkGrades.RELIC
      : LostArkGrades.ANCIENT;
}
export function determineGemGradeByGem(gem: ArkGridGem) {
  let basePoint = gem.name ? ArkGridGemSpecs[gem.name].req : 8;
  const totalPoint = basePoint - gem.req + gem.point + gem.option1.value + gem.option2.value;
  return totalPoint < 16
    ? LostArkGrades.LEGENDARY
    : totalPoint < 19
      ? LostArkGrades.RELIC
      : LostArkGrades.ANCIENT;
}

export function isSameArkGridGem(a: ArkGridGem | undefined, b: ArkGridGem | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  return (
    (a.name !== undefined && b.name !== undefined ? a.name === b.name : true) &&
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

const MapGemNameImage: Record<ArkGridGemName, string> = {
  '질서의 젬 : 안정': 'order_0',
  '질서의 젬 : 견고': 'order_1',
  '질서의 젬 : 불변': 'order_2',
  '혼돈의 젬 : 침식': 'chaos_0',
  '혼돈의 젬 : 왜곡': 'chaos_1',
  '혼돈의 젬 : 붕괴': 'chaos_2',
};
const gemImages = import.meta.glob<string>('/src/assets/gems/*.png', {
  eager: true,
  import: 'default',
});

export function getGemImage(gemAttr?: ArkGridAttr, gemName?: ArkGridGemName): string {
  if (!gemName) {
    return gemAttr == ArkGridAttrs.Order
      ? gemImages['/src/assets/gems/order_0.png']
      : gemImages['/src/assets/gems/chaos_0.png'];
  }
  return gemImages[`/src/assets/gems/${MapGemNameImage[gemName] ?? 'order_0'}.png`];
}
