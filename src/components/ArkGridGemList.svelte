<script lang="ts">
  import { currentCharacterProfile } from '../lib/store';
  import ArkGridGemDetail from './ArkGridGemDetail.svelte';

  // 탭 상태
  const orderGems = $derived(currentCharacterProfile().orderGems);
  const chaosGems = $derived(currentCharacterProfile().chaosGems);
  let activeTab = $state(0);
  const tabs = ['전체', '질서', '혼돈'];

  function selectTab(index: number) {
    activeTab = index;
  }

  function deleteGems() {
    if (window.confirm('모든 젬을 삭제하겠습니까?')) {
      orderGems.splice(0, orderGems.length);
      chaosGems.splice(0, chaosGems.length);
    }
    return;
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
        {#if activeTab === i}
          &gt
        {/if}
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
      <span class="epmty-description">보유한 젬이 없습니다.</span>
    {/if}
  </div>
</div>

<style>
  .panel {
    /* override gap and use margin*/
    gap: 0px;
  }
  .tab-container {
    display: flex;
    gap: 0.3em;
  }

  .tab {
    border: 1px solid #ccc;
    margin-bottom: 0.5rem;

    cursor: pointer;
  }

  .tab.active {
    background: #fff;
    font-weight: bold;
  }

  .gems {
    /* 남은 공간을 최대한 차지 */
    flex: 1;
    max-height: 40rem;

    /* 테두리 */
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 0.5rem 0.5rem 0;

    /* 내부 배치 */
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    gap: 0.5rem;
  }

  .gems > .epmty-description {
    align-self: center;
  }

  button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
</style>
