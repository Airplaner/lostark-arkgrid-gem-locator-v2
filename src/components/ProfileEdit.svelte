<script lang="ts">
  import {
    appConfig,
    currentProfileName,
    initArkGridCores,
  } from '../lib/store';

  $effect(() => {
    const name = currentProfileName.current;

    if (
      !appConfig.current.characterProfiles.some((p) => p.characterName === name)
    ) {
      appConfig.current.characterProfiles.push({
        characterName: name,
        orderGems: [],
        chaosGems: [],
        cores: initArkGridCores(),
      });
    }
  });
  let newProfileName: string = $derived('');
</script>

<div>
  <h3>프로필 설정</h3>
  <div>
    {#each appConfig.current.characterProfiles as profile}
      <button
        onclick={() => {
          currentProfileName.current = profile.characterName;
        }}
        class:active={profile.characterName === currentProfileName.current}
      >
        {profile.characterName}
      </button>
    {/each}
  </div>
  <div>
    <input bind:value={newProfileName} placeholder="캐릭터명" />
    <button
      onclick={() => {
        if (newProfileName.length > 0) {
          appConfig.current.characterProfiles.push({
            characterName: newProfileName,
            orderGems: [],
            chaosGems: [],
            cores: initArkGridCores(),
          });
          currentProfileName.current = newProfileName;
          newProfileName = '';
        }
      }}>추가</button
    >
  </div>
  <div>
    <button
      onclick={() => {
        const name = currentProfileName.current;
        if (name === '기본') return;

        const profiles = appConfig.current.characterProfiles;
        const index = profiles.findIndex((p) => p.characterName === name);
        if (index === -1) return;

        profiles.splice(index, 1);
        currentProfileName.current = profiles[index - 1].characterName;
      }}>현재 프로필 삭제</button
    >
  </div>
</div>

<style>
  button {
    margin-right: 4px;
  }

  button.active {
    font-weight: bold;
    border: 2px solid #4f46e5;
    background-color: #eef2ff;
  }
</style>
