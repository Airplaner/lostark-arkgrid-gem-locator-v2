import { get, writable, type Writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

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

// serializer object for svelte-persisted-store
const bigIntSerializer = {
  // bigInt의 경우 string으로 바꾼 뒤 가장 끝에 n을 붙여서 직렬화
  stringify: (value: any) => {
    return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v));
  },

  // string이고 n으로 끝나는 정수라면, BigInt화
  parse: (text: string) => {
    return JSON.parse(text, (_, v) => {
      if (typeof v === 'string' && /^\d+n$/.test(v)) {
        return BigInt(v.slice(0, -1));
      }
      return v;
    });
  },
};

export const orderGems: Writable<ArkgridGem[]> = persisted('orderGems', [], {
  serializer: bigIntSerializer,
});
export const chaosGems: Writable<ArkgridGem[]> = persisted('chaosGems', [], {
  serializer: bigIntSerializer,
});

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
