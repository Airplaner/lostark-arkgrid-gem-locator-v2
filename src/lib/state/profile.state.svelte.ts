import { persistedState } from 'svelte-persisted-state';

import { appConfig, initArkGridCores } from './appConfig.state.svelte';

export const DEFAULT_PROFILE_NAME = '기본';

export let currentProfileName = persistedState<string>(
  'currentProfileName',
  DEFAULT_PROFILE_NAME
);

export function currentCharacterProfile() {
  for (const profile of appConfig.current.characterProfiles) {
    if (profile.characterName == currentProfileName.current) {
      return profile;
    }
  }
  if (appConfig.current.characterProfiles.length == 0) {
    throw Error;
  }
  return appConfig.current.characterProfiles[0];
}

export function setCurrentProfileName(name: string) {
  currentProfileName.current = name;
}

export function addNewProfile(name: string) {
  if (name.length == 0 || name.length > 12) return;

  const existProfile = appConfig.current.characterProfiles.findIndex(
    (p) => p.characterName === name
  );
  if (existProfile != -1) return;
  appConfig.current.characterProfiles.push({
    characterName: name,
    gems: {
      orderGems: [],
      chaosGems: [],
    },
    cores: initArkGridCores(),
  });
  setCurrentProfileName(name);
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
