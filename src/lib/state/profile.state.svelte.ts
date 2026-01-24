import { persistedState } from 'svelte-persisted-state';

import {
  type ArkGridAttr,
  ArkGridAttrs,
  DEFAULT_PROFILE_NAME,
  LostArkGrades,
} from '../constants/enums';
import {
  type ArkGridCore,
  type ArkGridCoreType,
  ArkGridCoreTypes,
  createCore,
} from '../models/arkGridCores';
import { type ArkGridGem, determineGemGrade } from '../models/arkGridGems';
import {
  addNewProfile,
  appConfig,
  getProfile,
  initArkGridCores,
} from './appConfig.state.svelte';

export let currentProfileName = persistedState<string>(
  'currentProfileName',
  DEFAULT_PROFILE_NAME
);
export interface AllGems {
  orderGems: ArkGridGem[];
  chaosGems: ArkGridGem[];
}
export type WeaponInfo = {
  fixed: number;
  percent: number;
};
export interface CharacterProfile {
  characterName: string;
  gems: AllGems;
  cores: Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>;
  isSupporter: boolean;
  weapon?: WeaponInfo;
}

export function initNewProfile(name: string): CharacterProfile {
  return {
    characterName: name,
    gems: {
      orderGems: [],
      chaosGems: [],
    },
    cores: initArkGridCores(),
    isSupporter: false,
  };
}

export function getCurrentProfile() {
  // 현재 프로필을 반드시 반환합니다.
  const profile = getProfile(currentProfileName.current);
  if (profile) return profile;
  else {
    const defaultProfile = initNewProfile(DEFAULT_PROFILE_NAME);
    if (!addNewProfile(defaultProfile)) throw Error;
    return defaultProfile;
  }
}

export function setCurrentProfileName(name: string) {
  currentProfileName.current = name;
}

export function deleteProfile(name: string) {
  if (name === DEFAULT_PROFILE_NAME) return;
  const profiles = appConfig.current.characterProfiles;
  const index = profiles.findIndex((p) => p.characterName === name);

  if (index === -1) return;
  if (currentProfileName.current === name) {
    setCurrentProfileName(profiles[index - 1].characterName);
  }
  profiles.splice(index, 1);
  // 삭제한 프로필이 현재 선택된 프로필이면 초기화
}

export function addGem(gem: ArkGridGem) {
  const gems = getCurrentProfile().gems;
  const targetGems =
    gem.gemAttr == ArkGridAttrs.Order ? gems.orderGems : gems.chaosGems;
  gem.grade = determineGemGrade(
    gem.req,
    gem.point,
    gem.option1,
    gem.option2,
    gem.name
  );
  // validate gem (안정인데 옵션 등)
  targetGems.push(gem);
}

export function clearGems(gemAttr?: ArkGridAttr) {
  const gems = getCurrentProfile().gems;
  switch (gemAttr) {
    case ArkGridAttrs.Order:
      gems.orderGems.length = 0;
      break;
    case ArkGridAttrs.Chaos:
      gems.chaosGems.length = 0;
      break;
    default:
      gems.orderGems.length = 0;
      gems.chaosGems.length = 0;
  }
}

export function deleteGem(gem: ArkGridGem) {
  const gems = getCurrentProfile().gems;
  const targetGems =
    gem.gemAttr === ArkGridAttrs.Order ? gems.orderGems : gems.chaosGems;

  // 배열에서 gem 제거
  const index = targetGems.indexOf(gem);
  if (index !== -1) {
    targetGems.splice(index, 1);
  }
}
export function unassignGems() {
  const gems = getCurrentProfile().gems;
  gems.orderGems.forEach((g) => {
    delete g.assign;
  });
  gems.chaosGems.forEach((g) => {
    delete g.assign;
  });
}

export function getCore(attr: ArkGridAttr, ctype: ArkGridCoreType) {
  const cores = getCurrentProfile().cores;
  return cores[attr][ctype];
}
export function addCore(
  attr: ArkGridAttr,
  ctype: ArkGridCoreType,
  isSupporter: boolean
) {
  const profile = getCurrentProfile();
  const cores = profile.cores;
  cores[attr][ctype] = createCore(
    attr,
    ctype,
    LostArkGrades.EPIC,
    isSupporter,
    profile.weapon
  );
}
export function resetCore(attr: ArkGridAttr, ctype: ArkGridCoreType) {
  const cores = getCurrentProfile().cores;
  cores[attr][ctype] = null;
}
export function clearCores() {
  const cores = getCurrentProfile().cores;
  for (const attr of Object.values(ArkGridAttrs)) {
    for (const ctype of Object.values(ArkGridCoreTypes)) {
      cores[attr][ctype] = null;
    }
  }
}
export function updateCore(
  attr: ArkGridAttr,
  ctype: ArkGridCoreType,
  core: ArkGridCore
) {
  const cores = getCurrentProfile().cores;
  cores[attr][ctype] = JSON.parse(JSON.stringify(core));
}

export function updateIsSupporter(v: boolean) {
  const profile = getCurrentProfile();
  profile.isSupporter = v;
}

export function updateWeapon(fixed: number, percent: number) {
  const profile = getCurrentProfile();
  profile.weapon = {
    fixed,
    percent,
  };
}

export const roleImages = import.meta.glob<string>('/src/assets/role/*.png', {
  eager: true,
  import: 'default',
});
export const imgRoleCombat = roleImages['/src/assets/role/combat.png'];
export const imgRoleSupporter = roleImages['/src/assets/role/supporter.png'];
