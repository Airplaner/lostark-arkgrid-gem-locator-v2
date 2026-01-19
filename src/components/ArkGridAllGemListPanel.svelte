<script lang="ts">
  import { ArkGridAttrs } from '../lib/constants/enums';
  import { type AllGems, addGem } from '../lib/state/profile.state.svelte';
  import ArkGridGemList from './ArkGridGemList.svelte';

  interface Props {
    gems: AllGems;
  }

  let { gems }: Props = $props();

  // 탭 상태
  let activeTab = $state(0);
  const tabs = ['질서', '혼돈'];

  function selectTab(index: number) {
    activeTab = index;
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
  <ArkGridGemList gems={currentGems}></ArkGridGemList>
  <button
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
  button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
</style>
