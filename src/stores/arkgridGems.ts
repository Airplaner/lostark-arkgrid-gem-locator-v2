import { get, writable, type Writable } from 'svelte/store';

export enum ArkGridGemAttr {
  Order = '질서',
  Chaos = '혼돈',
}
export enum ArkgridGemOptionType {
  ATTACK = '공격력',
  SKILL_DAMAGE = '추가 피해',
  BOSS_DAMAGE = '보스 피해',
  PARTY_DAMAGE = '아군 피해 강화',
  STIGMA = '낙인력',
  PARTY_ATTACK = '아군 공격 강화',
}

export type ArkgridGemOption = {
  optionType: ArkgridGemOptionType;
  value: number;
};

export interface ArkgridGem {
  id: bigint;
  gemAttr: ArkGridGemAttr;
  name: string;
  req: number;
  point: number;
  option1: ArkgridGemOption;
  option2: ArkgridGemOption;
}

// 각각의 store 생성
export const orderGems: Writable<ArkgridGem[]> = writable([]);
export const chaosGems: Writable<ArkgridGem[]> = writable([]);

// gem 추가 함수
export function addGem(
  name: string,
  gemAttr: ArkGridGemAttr,
  req: number,
  point: number,
  option1: ArkgridGemOption,
  option2: ArkgridGemOption
) {
  const targetGems = gemAttr == ArkGridGemAttr.Order ? orderGems : chaosGems;
  const gem = { id: BigInt(Date.now()), gemAttr, name, req, point, option1, option2 };

  targetGems.update((i) => {
    return [...i, gem];
  });
  console.log(get(targetGems));
}
