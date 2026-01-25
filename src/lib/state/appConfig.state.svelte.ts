import { persistedState } from 'svelte-persisted-state';

import {
  type ArkGridAttr,
  ArkGridAttrs,
  DEFAULT_PROFILE_NAME,
} from '../constants/enums';
import {
  type ArkGridCore,
  type ArkGridCoreType,
  ArkGridCoreTypes,
} from '../models/arkGridCores';
import { type CharacterProfile, initNewProfile, migrateProfile } from './profile.state.svelte';
import { apiClient } from '../openapi/openapi';

export interface OpenApiConfig {
  jwt?: string;
}
interface UIConfig {
  showGemRecognitionPanel: boolean;
  showGemRecognitionGuide: boolean;
  showCoreCoeff: boolean;
  debugMode: boolean;
}
const defaultUIConfig: UIConfig = {
  showGemRecognitionPanel: true,
  showGemRecognitionGuide: true,
  showCoreCoeff: false,
  debugMode: false,
};
export type AppLocale = 'ko_kr' | 'en_us';
interface AppConfig {
  characterProfiles: CharacterProfile[];
  openApiConfig: OpenApiConfig;
  uiConfig: UIConfig;
  locale: AppLocale;
}

// serializer object for svelte-persisted-state
export const bigIntSerializer = {
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
export function migrateAppConfig(appConfig: Partial<AppConfig>) {
  // locale 없으면 ko_kr로 추가
  if (appConfig.locale === undefined) {
    appConfig.locale = 'ko_kr';
  }
}

export const appConfig = persistedState<AppConfig>(
  'appConfig',
  {
    characterProfiles: [initNewProfile(DEFAULT_PROFILE_NAME)],
    openApiConfig: {},
    uiConfig: defaultUIConfig,
    locale: 'ko_kr',
  },
  {
    serializer: bigIntSerializer,
    beforeRead: (value) => {
      migrateAppConfig(value);
      // localStore에 있는 건 app이 기대하는 형태가 아닐 수 있음
      for (const profile of value.characterProfiles) {
        migrateProfile(profile);
      }
      return value
    }
  },
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
export function getProfile(name: string) {
  // 현재 appConfig에서 주어진 이름의 프로필을 조회합니다.
  return appConfig.current.characterProfiles.find(
    (p) => p.characterName === name
  );
}
export function addNewProfile(profile: CharacterProfile) {
  // 새 CharacterProfile을 appConfig에 등록합니다.
  // 등록에 성공했으면 true, 실패했으면 false를 반환합니다.
  const name = profile.characterName;
  if (name.length == 0 || name.length > 12) return false;
  const existProfile = appConfig.current.characterProfiles.findIndex(
    (p) => p.characterName === name
  );
  if (existProfile != -1) return false;
  appConfig.current.characterProfiles.push(profile);
  return true;
}
export function toggleUI(optionName: keyof UIConfig) {
  appConfig.current.uiConfig[optionName] =
    !appConfig.current.uiConfig[optionName];
}

(window as any).debug = (() => { toggleUI('debugMode'); });

export function updateOpenApiJWT(jwtInput: string) {
  if (jwtInput.length > 0) {
    const jwtTrimed = jwtInput.trim();
    appConfig.current.openApiConfig.jwt = jwtTrimed;
    apiClient.setSecurityData({
      jwt: jwtTrimed
    });
  }
}

export function toggleLocale() {
  if (appConfig.current.locale == 'ko_kr') {
    appConfig.current.locale = 'en_us';
  } else {
    appConfig.current.locale = 'ko_kr';
  }
}
