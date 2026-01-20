<script lang="ts">
  import { toast } from '@zerodevx/svelte-toast';
  import { tick } from 'svelte';

  import { ArkGridAttrs } from '../lib/constants/enums';
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
  let container: ArkGridGemList;
  let orderGems = $derived(gems.orderGems);
  let chaosGems = $derived(gems.chaosGems);
  let scrollPositions = $state<number[]>([0, 0]);

  // 탭 상태
  let activeTab = $state(0);
  const tabs = ['질서', '혼돈'];
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

  export function selectTab(index: number) {
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
  export function scroll(command: 'top' | 'bottom') {
    container.scroll(command);
  }

  function applyGemList() {
    // 현재 수집한 젬을 현재 프로필에 덮어 씌우기
    let done = false;
    if (orderGems.length > 0) {
      clearGems(ArkGridAttrs.Order);
      for (const gem of orderGems) {
        addGem(gem);
      }
      done = true;
    }
    if (chaosGems.length > 0) {
      clearGems(ArkGridAttrs.Chaos);
      for (const gem of chaosGems) {
        addGem(gem);
      }
      done = true;
    }
    return done;
  }
</script>

<div class="panel">
  <div class="title">인식된 젬 목록</div>
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
  <ArkGridGemList
    gems={currentGems}
    emptyDescription="인식된 젬이 없습니다."
    bind:this={container}
  ></ArkGridGemList>
  <div class="gem-count">
    젬 보유 수량 {orderGems.length + chaosGems.length} / 100<br />(질서 {orderGems.length}개,
    혼돈 {chaosGems.length}개 보유 중)
  </div>
  <div class="buttons">
    <div>
      <button
        onclick={() => {
          if (applyGemList()) toast.push('반영 완료!');
        }}
        disabled={orderGems.length == 0 && chaosGems.length == 0}
      >
        ✅ 현재 프로필에 반영
      </button>
    </div>
    <div>
      <button
        hidden={!appConfig.current.uiConfig.debugMode}
        onclick={() => scroll('top')}>▲</button
      >
      <button
        hidden={!appConfig.current.uiConfig.debugMode}
        onclick={() => scroll('bottom')}>▼</button
      >
      <button
        disabled={orderGems.length == 0 && chaosGems.length == 0}
        onclick={() => {
          orderGems.length = 0;
          chaosGems.length = 0;
        }}>초기화</button
      >
    </div>
  </div>
</div>

<style>
  .panel {
    min-height: 40rem;
    max-height: 45rem;
  }
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
  .gem-count {
    align-self: center;
    text-align: center;
  }

  /* 버튼 모음 */
  .buttons {
    display: flex;
    gap: 0.4rem;
    justify-content: space-between;
  }
  .buttons button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;
  }
</style>
