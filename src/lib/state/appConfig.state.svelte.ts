import { persistedState } from 'svelte-persisted-state';

import { type ArkGridAttr, ArkGridAttrs } from '../constants/enums';
import {
  type ArkGridCore,
  type ArkGridCoreType,
  ArkGridCoreTypes,
} from '../models/arkGridCores';
import { type ArkGridGem, determineGemGrade } from '../models/arkGridGems';

export interface OpenApiConfig {
  jwt?: string;
}
interface UIConfig {
  showGemAddPanel: boolean;
  showCoreCoeff: boolean;
}
export interface AllGems {
  orderGems: ArkGridGem[];
  chaosGems: ArkGridGem[];
}
interface CharacterInformation {
  characterName: string;
  gems: AllGems;
  cores: Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>;
}
interface AppConfig {
  characterProfiles: CharacterInformation[];
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

export const appConfig = persistedState<AppConfig>(
  'appConfig',
  {
    characterProfiles: [
      {
        characterName: '기본',
        gems: {
          orderGems: [],
          chaosGems: [],
        },
        cores: initArkGridCores(),
      },
    ],
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
