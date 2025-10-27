<script lang="ts">
  import { globalAppConfig } from '../lib/store';
  import ArkGridGemDetail from './ArkGridGemDetail.svelte';

  // 탭 상태
  const orderGems = $derived(globalAppConfig.current.orderGems);
  const chaosGems = $derived(globalAppConfig.current.chaosGems);
  let activeTab = $state(0);
  const tabs = ['전체', '질서', '혼돈'];

  function selectTab(index: number) {
    activeTab = index;
  }

  function deleteGems() {
    if (activeTab == 0) {
      orderGems.splice(0, orderGems.length);
      chaosGems.splice(0, chaosGems.length);
    } else if (activeTab == 1) {
      orderGems.splice(0, orderGems.length);
    } else if (activeTab == 2) {
      chaosGems.splice(0, chaosGems.length);
    }
  }

  // reactive variable
  let currentGems = $derived(
    activeTab === 0
      ? [...orderGems, ...chaosGems]
      : activeTab == 1
        ? orderGems
        : chaosGems
  );
</script>

<div class="panel">
  <button onclick={() => deleteGems()}>젬 초기화</button>
  <div class="tab-container">
    {#each tabs as tab, i}
      <button
        class="tab {activeTab === i ? 'active' : ''}"
        onclick={() => selectTab(i)}
      >
        {tab}
      </button>
    {/each}
  </div>

  <div class="gems">
    {#if currentGems.length > 0}
      {#each currentGems as gem}
        <ArkGridGemDetail {gem} />
      {/each}
    {:else}
      <span> 젬을 추가해주세요. </span>
    {/if}
  </div>
</div>

<style>
  .tab-container {
    display: flex;
    border-bottom: 2px solid #ccc;
    gap: 0.15em;
  }

  .tab {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-bottom: none;
    border-radius: 5px 5px 0 0;
    background: #eee;
    cursor: pointer;
    margin-right: 2px;
  }

  .tab.active {
    background: #fff;
    font-weight: bold;
  }

  .gems {
    flex: 1;
    max-height: 100rem;
    padding-right: 0.5rem;
    display: flex;
    flex-direction: column;

    overflow-y: auto;
    gap: 0.5rem;
  }

  button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
</style>
