import { ArkGridAttr } from '../constants/enums';
import { chaosGems, orderGems } from '../../stores/store';

export enum ArkGridGemOptionType {
  ATTACK = '공격력',
  SKILL_DAMAGE = '추가 피해',
  BOSS_DAMAGE = '보스 피해',
  PARTY_DAMAGE = '아군 피해 강화',
  STIGMA = '낙인력',
  PARTY_ATTACK = '아군 공격 강화',
}

export type ArkGridGemOption = {
  optionType: ArkGridGemOptionType;
  value: number;
};

export interface ArkGridGem {
  id: bigint;
  gemAttr: ArkGridAttr;
  name: string;
  req: number;
  point: number;
  option1: ArkGridGemOption;
  option2: ArkGridGemOption;
}

// gem 추가 함수
export function addGem(
  name: string,
  gemAttr: ArkGridAttr,
  req: number,
  point: number,
  option1: ArkGridGemOption,
  option2: ArkGridGemOption
) {
  const targetGems = gemAttr == ArkGridAttr.Order ? orderGems : chaosGems;
  targetGems.update((gems) => {

    const gem = { id: gems.length, gemAttr, name, req, point, option1, option2 };
    return [...gems, gem];
  });
}
