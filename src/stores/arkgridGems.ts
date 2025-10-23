import { writable, type Writable } from 'svelte/store';

export enum ArkGridGemAttr {
  Order = '질서',
  Chaos = '혼돈',
}

export interface ArkgridGem {
  id: bigint;
  gemAttr: ArkGridGemAttr;
  name: string;
  req: number;
  point: number;
}

// 각각의 store 생성
export const orderGems: Writable<ArkgridGem[]> = writable([]);
export const chaosGems: Writable<ArkgridGem[]> = writable([]);

// gem 추가 함수
export function addGem(name: string, gemAttr: ArkGridGemAttr, req: number, point: number) {
  const targetGems = gemAttr == ArkGridGemAttr.Order ? orderGems : chaosGems;
  const gem = { id: BigInt(Date.now()), gemAttr, name, req, point };

  targetGems.update((i) => {
    return [...i, gem];
  });
}
