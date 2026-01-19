<script lang="ts">
  import { DEFAULT_PROFILE_NAME } from '../../lib/constants/enums';
  import {
    addNewProfile,
    appConfig,
  } from '../../lib/state/appConfig.state.svelte';
  import {
    currentProfileName,
    deleteProfile,
    initNewProfile,
    setCurrentProfileName,
  } from '../../lib/state/profile.state.svelte';
</script>

<div class="root">
  <div class="title">👤 프로필</div>
  <div class="buttons">
    {#each appConfig.current.characterProfiles as profile}
      <button
        class="profile-select-button"
        onclick={() => setCurrentProfileName(profile.characterName)}
        class:active={profile.characterName === currentProfileName.current}
      >
        {profile.characterName}
      </button>
    {/each}
    <button
      onclick={() => {
        const profileName = window.prompt(
          '새 프로필에 사용할 캐릭터명을 입력해주세요.'
        );
        if (profileName === null || profileName.length == 0) return;
        addNewProfile(initNewProfile(profileName));
      }}>📁</button
    >
    <button
      onclick={() => {
        if (
          window.confirm(
            `"${currentProfileName.current}" 프로필을 삭제하시겠습니까?`
          )
        ) {
          deleteProfile(currentProfileName.current);
        }
      }}
      disabled={currentProfileName.current === DEFAULT_PROFILE_NAME}>🗑️</button
    >
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    user-select: none;
  }
  .title {
    font-weight: 700;
    font-size: 1.4rem;
  }
  .profile-select-button {
    /* 추가, 삭제 버튼과 구분되게 좀 크게 */
    height: 2.6rem;
  }
  .buttons {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
  }
  button.active {
    background: #fff;
    font-weight: bold;
    border: 2px solid;
  }
</style>
