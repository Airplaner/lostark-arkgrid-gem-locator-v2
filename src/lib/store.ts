import { persistedState } from 'svelte-persisted-state';

import { type ArkGridAttr, ArkGridAttrs } from './constants/enums';
import {
  type ArkGridCore,
  type ArkGridCoreType,
  ArkGridCoreTypes,
} from './models/arkGridCores';
import { type ArkGridGem, determineGemGrade } from './models/arkGridGems';

export interface OpenApiConfig {
  jwt?: string;
  charname?: string;
}
interface UIConfig {
  showGemAddPanel: boolean;
  showCoreCoeff: boolean;
}
interface AppConfig {
  orderGems: ArkGridGem[];
  chaosGems: ArkGridGem[];
  cores: Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>;
  openApiConfig: OpenApiConfig;
  uiConfig: UIConfig;
}

// serializer object for svelte-persisted-state
const bigIntSerializer = {
  // bigInt의 경우 string으로 바꾼 뒤 가장 끝에 n을 붙여서 직렬화
  stringify: (value: any) => {
    return JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() + 'n' : v
    );
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

export const globalAppConfig = persistedState<AppConfig>(
  'appConfig',
  {
    orderGems: [],
    chaosGems: [],
    cores: initArkGridCores(),
    openApiConfig: {},
    uiConfig: {
      showGemAddPanel: false,
      showCoreCoeff: false,
    },
  },
  {
    serializer: bigIntSerializer,
  }
);

export function initArkGridCores(): Record<
  ArkGridAttr,
  Record<ArkGridCoreType, ArkGridCore | null>
> {
  const cores = {} as Record<
    ArkGridAttr,
    Record<ArkGridCoreType, ArkGridCore | null>
  >;

  for (const attr of Object.values(ArkGridAttrs)) {
    cores[attr] = {} as Record<ArkGridCoreType, ArkGridCore | null>;
    for (const type of Object.values(ArkGridCoreTypes)) {
      cores[attr][type] = null; // 코어가 아직 없는 상태
    }
  }

  return cores;
}
// gem 추가 함수
export function addGem(gem: ArkGridGem) {
  if (!gem.grade) {
    determineGemGrade(gem.req, gem.point, gem.option1, gem.option2);
  }
  const targetGems =
    gem.gemAttr == ArkGridAttrs.Order
      ? globalAppConfig.current.orderGems
      : globalAppConfig.current.chaosGems;
  targetGems.push(gem);
  // 의지력 오름차순, 포인트 내림차순 정렬 및 모든 assign 제거
  targetGems.sort((a, b) => a.req - b.req || b.point - a.point);
  targetGems.forEach((g) => delete g.assign);
}
