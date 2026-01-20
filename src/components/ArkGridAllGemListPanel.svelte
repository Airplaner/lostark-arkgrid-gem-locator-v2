<script lang="ts">
  import { tick } from 'svelte';

  import { type ArkGridAttr, ArkGridAttrs } from '../lib/constants/enums';
  import { appConfig } from '../lib/state/appConfig.state.svelte';
  import {
    type AllGems,
    addGem,
    clearGems,
  } from '../lib/state/profile.state.svelte';
  import ArkGridGemList from './ArkGridGemList.svelte';

  interface Props {
    gems: AllGems;
  }

  let { gems }: Props = $props();

  // 탭 상태
  let activeTab = $state(0);
  const tabs = ['질서', '혼돈'];
  let container: ArkGridGemList;
  let scrollPositions = $state<number[]>([0, 0]);

  function selectTab(index: number) {
    scrollPositions[activeTab] = container?.getScrollTop?.() ?? 0;
    activeTab = index;
    // 다음 tick 이후 복원
    queueMicrotask(async () => {
      await tick();
      await new Promise(requestAnimationFrame);

      const pos = scrollPositions[index];
      if (pos != null) {
        container.scrollToPosition(pos);
      }
    });
  }

  // reactive variable
  let currentGems = $derived.by(() => {
    switch (activeTab) {
      case 0:
        return gems.orderGems;
      case 1:
        return gems.chaosGems;
      default:
        return [];
    }
  });
  let currentAttr: ArkGridAttr = $derived(
    activeTab == 0 ? ArkGridAttrs.Order : ArkGridAttrs.Chaos
  );
</script>

<div class="panel">
  <div class="title">젬 목록</div>
  <div class="tab-container">
    {#each tabs as tab, i}
      <button
        class="tab {activeTab === i ? 'active' : ''}"
        onclick={() => selectTab(i)}
      >
        {#if activeTab === i}
          &gt
        {/if}
        {tab}
      </button>
    {/each}
  </div>
  <ArkGridGemList gems={currentGems} bind:this={container}></ArkGridGemList>
  <div class="buttons">
    <button
      hidden={!appConfig.current.uiConfig.debugMode}
      onclick={() => {
        addGem({
          gemAttr: activeTab == 0 ? ArkGridAttrs.Order : ArkGridAttrs.Chaos,
          req: 3,
          point: 5,
          option1: { optionType: '공격력', value: 1 },
          option2: { optionType: '추가 피해', value: 1 },
        });
      }}>샘플 추가</button
    >
    <button onclick={() => clearGems(currentAttr)}>초기화</button>
  </div>
</div>

<style>
  .tab-container {
    display: flex;
    gap: 0.3em;
  }

  .tab {
    border: 1px solid #ccc;
    cursor: pointer;
  }

  .tab.active {
    background: #fff;
    font-weight: bold;
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
</style>
