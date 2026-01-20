<script lang="ts">
  import { tick } from 'svelte';

  import type { ScrollCommand } from '../lib/constants/enums';
  import type { ArkGridGem } from '../lib/models/arkGridGems';
  import ArkGridGemDetail from './ArkGridGemDetail.svelte';

  interface Props {
    gems: ArkGridGem[];
    showDeleteButton?: boolean;
    emptyDescription?: string;
  }
  let {
    gems,
    showDeleteButton = true,
    emptyDescription = '보유한 젬이 없습니다.',
  }: Props = $props();

  let container: HTMLDivElement;
  let scheduled = false;
  let lastCommand: ScrollCommand = null;

  export function scroll(command: 'top' | 'bottom') {
    // DOM 갱신이 완료된 이후에 가장 위 혹은 아래로 scroll
    lastCommand = command;

    if (scheduled) return;

    scheduled = true;

    queueMicrotask(async () => {
      await tick();
      await new Promise(requestAnimationFrame);

      scheduled = false;

      if (!lastCommand) return;

      if (lastCommand === 'top') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }

      lastCommand = null;
    });
  }
  export function getScrollTop() {
    // 현재 내부 컨테이너의 scrollTop 반환
    return container.scrollTop;
  }

  export function scrollToPosition(top: number) {
    // 특정 위치로 즉시 scroll
    container.scrollTo({
      top,
      behavior: 'auto',
    });
  }
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
