<script lang="ts">
  import { orderGems, chaosGems, ArkGridGemAttr } from '../stores/arkgridGems';
  import ArkgridGemDetail from './ArkgridGemDetail.svelte';

  // 탭 상태
  let activeTab = 0;
  const tabs = ['전체', '질서', '혼돈'];

  function selectTab(index: number) {
    activeTab = index;
  }

  // reactive variable
  $: currentGems =
    activeTab === 0 ? [...$orderGems, ...$chaosGems] : activeTab == 1 ? $orderGems : $chaosGems;
</script>

<div class="panel">
  <div class="tab-container">
    {#each tabs as tab, i}
      <button class="tab {activeTab === i ? 'active' : ''}" on:click={() => selectTab(i)}>
        {tab}
      </button>
    {/each}
  </div>

  <div class="gems">
    {#each currentGems as gem (gem.id)}
      <ArkgridGemDetail {gem} />
    {/each}
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
</style>
