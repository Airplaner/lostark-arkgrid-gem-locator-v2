<script lang="ts">
  import { onMount } from 'svelte';

  import AppConfiguration from './components/AppConfiguration.svelte';
  import ArkGridCoreEditPanel from './components/ArkGridCoreEditPanel.svelte';
  import ArkgridGemAddPanel from './components/ArkGridGemAddPanel.svelte';
  import ArkGridGemList from './components/ArkGridGemList.svelte';

  /* origin (왼쪽 코어) 패널의 높이에 맞춰서 other (오른쪽 젬) 패널의 높이 조절*/
  let originRef = $state<HTMLDivElement | undefined>();
  let otherRef = $state<HTMLDivElement | undefined>();

  function matchHeight() {
    if (originRef && otherRef) {
      const child = originRef.querySelector('div');
      if (!child) return;
      const originHeight = originRef.offsetHeight;
      // originRef margin 제외. border-box는 margin을 포함하지 않음
      const childStyle = getComputedStyle(child);
      const originMarginTop = parseFloat(childStyle.marginTop);
      const originMarginBottom = parseFloat(childStyle.marginBottom);

      const adjustedHeight =
        originHeight - originMarginTop - originMarginBottom;
      otherRef.style.height = adjustedHeight + 'px';
    }
  }

  let observer: ResizeObserver;
  onMount(() => {
    observer = new ResizeObserver(matchHeight);
    if (originRef) observer.observe(originRef);
    return () => window.removeEventListener('resize', matchHeight);
  });
</script>

<main>
  <!-- <h3>아크그리드 젬 배치기</h3> -->
  <AppConfiguration></AppConfiguration>
  <ArkgridGemAddPanel />
  <div class="dual-panel">
    <div bind:this={originRef as HTMLDivElement}>
      <ArkGridCoreEditPanel />
    </div>
    <div bind:this={otherRef as HTMLDivElement}>
      <ArkGridGemList />
    </div>
  </div>
</main>

<style>
  .dual-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  /* 화면이 600px 이하로 좁아지면 세로 배치 */
  @media (max-width: 960px) {
    .dual-panel {
      grid-template-columns: 1fr; /* 한 줄에 1개 */
    }
  }
</style>
