import { ArkGridAttr, ArkGridGrade } from '../constants/enums';
import { chaosGems, orderGems } from '../../stores/store';

export enum ArkGridGemOptionType {
  ATTACK = '공격력',
  SKILL_DAMAGE = '추가 피해',
  BOSS_DAMAGE = '보스 피해',
  PARTY_DAMAGE = '아군 피해 강화',
  STIGMA = '낙인력',
  PARTY_ATTACK = '아군 공격 강화',
}

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
  grade?: ArkGridGrade;
  gemAttr: ArkGridAttr;
  req: number;
  point: number;
  option1: ArkGridGemOption;
  option2: ArkGridGemOption;
}

function determineGemGrade(gem: ArkGridGem) {
  const totalPoint =
    gem.req + gem.point + gem.option1.value + gem.option2.value;
  gem.grade =
    totalPoint < 16
      ? ArkGridGrade.LEGENDARY
      : totalPoint < 19
        ? ArkGridGrade.RELIC
        : ArkGridGrade.ANCIENT;
}

// gem 추가 함수
export function addGem(gem: ArkGridGem) {
  if (!gem.grade) {
    determineGemGrade(gem);
  }
  const targetGems = gem.gemAttr == ArkGridAttr.Order ? orderGems : chaosGems;
  targetGems.update((gems) => {
    return [...gems, gem];
  });
}
