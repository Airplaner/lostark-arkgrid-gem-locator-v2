<script lang="ts">
  import { orderGems, chaosGems, ArkGridGemAttr } from '../stores/arkgridGems';
  import type { ArkgridGem } from '../stores/arkgridGems';

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

<div class="flex gap-2 mb-2">
  <button
    on:click={() => (selectedAttr = ArkGridGemAttr.Order)}
    class="px-3 py-1 rounded border {selectedAttr === ArkGridGemAttr.Order
      ? 'bg-blue-500 text-white'
      : ''}"
  >
    Order
  </button>
  <button
    on:click={() => (selectedAttr = ArkGridGemAttr.Chaos)}
    class="px-3 py-1 rounded border {selectedAttr === ArkGridGemAttr.Chaos
      ? 'bg-blue-500 text-white'
      : ''}"
  >
    Chaos
  </button>
  <button
    on:click={() => (selectedAttr = 'All')}
    class="px-3 py-1 rounded border {selectedAttr === 'All' ? 'bg-blue-500 text-white' : ''}"
  >
    전체보기
  </button>
</div>

<ul class="space-y-2">
  {#each currentGems as obj (obj.id)}
    <li class="border rounded p-3 flex justify-between items-center">
      <span>{obj.name}</span>
      <span class="text-gray-500">{obj.gemAttr}</span>
      <span class="text-gray-500">{obj.req}</span>
      <span class="text-gray-500">{obj.point}</span>
    </li>
  {/each}

  {#if currentGems.length === 0}
    <li class="text-gray-400 italic text-sm">아직 객체가 없습니다.</li>
  {/if}
</ul>
