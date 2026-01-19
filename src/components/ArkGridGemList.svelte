<script lang="ts">
  import type { ScrollCommand } from '../lib/constants/enums';
  import type { ArkGridGem } from '../lib/models/arkGridGems';
  import ArkGridGemDetail from './ArkGridGemDetail.svelte';

  interface Props {
    gems: ArkGridGem[];
    showDeleteButton?: boolean;
    emptyDescription?: string;
    scrollCommand: ScrollCommand;
  }
  let {
    gems,
    showDeleteButton = true,
    emptyDescription = '보유한 젬이 없습니다.',
    scrollCommand = null,
  }: Props = $props();

  let container: HTMLDivElement;

  $effect(() => {
    if (scrollCommand === null) return;
    switch (scrollCommand.type) {
      case 'top':
        container.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        break;
      case 'bottom':
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
        break;

      default:
        break;
    }
  });
</script>

<div class="gems" bind:this={container}>
  {#if gems.length > 0}
    {#each gems as gem}
      <ArkGridGemDetail {gem} {showDeleteButton} />
    {/each}
  {:else}
    <span class="epmty-description">{emptyDescription} </span>
  {/if}
</div>

<style>
  .gems {
    /* 남은 공간을 최대한 차지 */
    flex: 1;
    max-height: 60rem; /* 모바일 모드일때 너무 길어지는 걸 방지 */

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
</style>
