<script lang="ts">
  import { ArkGridAttrs } from '../lib/constants/enums';
  import { ArkGridCoreTypes, resetCoreCoeff } from '../lib/models/arkGridCores';
  import { appConfig, toggleUI } from '../lib/state/appConfig.state.svelte';
  import {
    type CharacterProfile,
    updateIsSupporter,
  } from '../lib/state/profile.state.svelte';
  import ArkGridCoreEditElement from './ArkGridCoreEditElement.svelte';

  interface Props {
    profile: CharacterProfile;
  }
  let { profile }: Props = $props();
  let cores = $derived(profile.cores);
  let isSupporter = $derived(profile.isSupporter);

  const attrs = Object.values(ArkGridAttrs);
  const ctypes = Object.values(ArkGridCoreTypes);

  function toggleIsSupporter() {
    // 딜러 서폿 전환
    updateIsSupporter(!profile.isSupporter);

    // 코어들 계수 서폿용으로 다시 입력
    for (const attr of attrs) {
      for (const ctype of ctypes) {
        const core = cores[attr][ctype];
        if (!core) continue;
        core.tier = 0; // 티어 모두 초기화. TODO 티어 저장? 굳이?
        resetCoreCoeff(core, isSupporter, profile.weapon);
      }
    }
  }
</script>

<div class="panel">
  <div class="title-and-button">
    <div class="title">코어 설정 - {isSupporter ? '서포터' : '딜러'}</div>
    <button onclick={toggleIsSupporter}
      >{isSupporter ? '딜러' : '서포터'}로 전환</button
    >
  </div>
  {#each attrs as attr}
    {#each ctypes as ctype}
      <ArkGridCoreEditElement
        {attr}
        {ctype}
        {isSupporter}
        weapon={profile.weapon}
      ></ArkGridCoreEditElement>
    {/each}
  {/each}
  <div class="buttons">
    <button
      onclick={() => {
        toggleUI('showCoreCoeff');
      }}
    >
      전투력 계수 {appConfig.current.uiConfig.showCoreCoeff ? '숨김' : '수정'}
    </button>
  </div>
</div>

<style>
  .panel {
    position: relative; /* overlay 위치 기준 */
  }

  /* 버튼 모음 */
  .buttons {
    display: flex;
    gap: 0.4rem;
    justify-content: right;
  }
  .buttons > button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;
  }
  .title-and-button {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .title-and-button .title {
    font-size: 1.4rem;
    font-weight: 700;
  }
</style>
