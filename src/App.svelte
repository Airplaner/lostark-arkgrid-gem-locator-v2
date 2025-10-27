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
      otherRef.style.height = originRef.offsetHeight + 'px';
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
  <div class="contents">
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
  </div>
</main>

<style>
  .contents {
    display: flex;
    flex-direction: column;
    gap: var(--global-gap);
    /* 넓을 땐 20px 패딩, 960px 이후 (세로 레아이웃) 점점 좁아짐 */
    padding: clamp(8px, 2.083vw, 20px);
  }
  .dual-panel {
    gap: var(--global-gap);
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
  }

  /* 화면이 600px 이하로 좁아지면 세로 배치 */
  @media (max-width: 960px) {
    .dual-panel {
      grid-template-columns: 1fr; /* 한 줄에 1개 */
    }
  }
</style>
