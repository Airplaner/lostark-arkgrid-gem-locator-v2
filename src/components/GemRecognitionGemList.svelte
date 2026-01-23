<script lang="ts">
  import { toast } from '@zerodevx/svelte-toast';
  import { tick } from 'svelte';

  import { ArkGridAttrs } from '../lib/constants/enums';
  import { appConfig } from '../lib/state/appConfig.state.svelte';
  import {
    type AllGems,
    addGem,
    clearGems,
    getCurrentProfile,
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

  function applyGemList(overrideGem: boolean) {
    // 현재 수집한 젬을 현재 프로필에 덮어 씌우기
    let done = false;
    if (orderGems.length > 0) {
      if (overrideGem) clearGems(ArkGridAttrs.Order);
      for (const gem of orderGems) {
        addGem(gem);
      }
      done = true;
    }
    if (chaosGems.length > 0) {
      if (overrideGem) clearGems(ArkGridAttrs.Chaos);
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
    showDeleteButton={false}
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
        disabled={orderGems.length == 0 && chaosGems.length == 0}
        onclick={() => {
          // 혼돈 젬을 인식하지 않은 경우 한 번 경고
          // if (chaosGems.length == 0) {
          //   if (
          //     !window.confirm(
          //       '혼돈 젬을 인식하지 않았습니다. 진행하시겠습니까?'
          //     )
          //   )
          //     return;
          // }

          // 현재 프로필에 젬이 있는 경우 덮어 씌울 것인지 물음
          const profile = getCurrentProfile();
          let overrideGem = true;

          if (
            profile.gems.orderGems.length > 0 ||
            profile.gems.chaosGems.length > 0
          ) {
            overrideGem = window.confirm(
              '⚠️현재 프로필에 젬이 존재합니다.\n' +
                '해당 젬을 모두 삭제하고 덮어 씌우시겠습니까?\n' +
                '취소할 경우 인식된 젬이 추가만 됩니다.'
            );
          }
          if (applyGemList(overrideGem)) toast.push('반영 완료!');
        }}
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
    min-height: 46rem;
    max-height: 46rem;
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
