<script lang="ts">
  import { orderGems, chaosGems, ArkGridGemAttr } from '../stores/arkgridGems';

  // 탭 상태
  let selectedAttr: ArkGridGemAttr | 'All' = 'All';

  // reactive variable
  $: currentGems =
    selectedAttr === 'All'
      ? [...$orderGems, ...$chaosGems]
      : selectedAttr === ArkGridGemAttr.Order
        ? $orderGems
        : $chaosGems;
</script>

<div>
  <button on:click={() => (selectedAttr = ArkGridGemAttr.Order)}>질서</button>
  <button on:click={() => (selectedAttr = ArkGridGemAttr.Chaos)}>혼돈</button>
  <button on:click={() => (selectedAttr = 'All')}>전체</button>
</div>

<ul>
  {#each currentGems as obj (obj.id)}
    <li>
      <span>{obj.name}</span>
      <span>{obj.gemAttr}</span>
      <span>{obj.req}</span>
      <span>{obj.point}</span>
    </li>
  {/each}

  {#if currentGems.length === 0}
    <li>아직 객체가 없습니다.</li>
  {/if}
</ul>
