import type { Writable } from 'svelte/store';
import { ArkGridCoreType, type ArkGridCore } from '../lib/models/arkGridCores';
import type { ArkGridGem } from '../lib/models/arkGridGems';
import { persisted, type Persisted } from 'svelte-persisted-store';
import { ArkGridAttr } from '../lib/constants/enums';

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

export const orderGems: Persisted<ArkGridGem[]> = persisted('orderGems', [], {
  serializer: bigIntSerializer,
});
export const chaosGems: Persisted<ArkGridGem[]> = persisted('chaosGems', [], {
  serializer: bigIntSerializer,
});

export function initArkGridCores(): Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>> {
  const cores = {} as Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>;

  for (const attr of Object.values(ArkGridAttr)) {
    cores[attr] = {} as Record<ArkGridCoreType, ArkGridCore | null>;
    for (const type of Object.values(ArkGridCoreType)) {
      cores[attr][type] = null; // 코어가 아직 없는 상태
    }
  }

  return cores;
}
export const arkGridCores: Persisted<
  Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>
> = persisted('arkGridCores', initArkGridCores());
