<script lang="ts">
  import { onMount } from 'svelte';

  import type { CharacterProfile } from '../lib/state/profile.state.svelte';
  import ArkGridAllGemListPanel from './ArkGridAllGemListPanel.svelte';
  import ArkGridCoreEditPanel from './ArkGridCoreEditPanel.svelte';
  import SolvePanel from './SolvePanel.svelte';

  interface Props {
    profile: CharacterProfile | null;
  }
  let { profile = $bindable() }: Props = $props();

  /* origin (왼쪽 코어) 패널의 높이에 맞춰서 other (오른쪽 젬) 패널의 높이 조절*/
  let originRef = $state<HTMLDivElement | undefined>();
  let otherRef = $state<HTMLDivElement | undefined>();

  function matchHeight() {
    if (originRef && otherRef) {
      otherRef.style.height = originRef.offsetHeight + 'px';
    }
  }

  let observer: ResizeObserver;
  let mediaQuery: MediaQueryList;
  function setupObserver() {
    if (!originRef) return;
    if (observer) observer.disconnect(); // 기존 옵저버 해제

    // 화면이 960px 초과일 때만 옵저버 연결
    if (!mediaQuery.matches) {
      observer = new ResizeObserver(matchHeight);
      observer.observe(originRef);
      matchHeight(); // 초기 1회 맞춤
    } else {
      // 모바일 모드면 높이 초기화
      if (otherRef) otherRef.style.height = 'auto';
    }
  }

  onMount(() => {
    mediaQuery = window.matchMedia('(max-width: 960px)');
    setupObserver(); // 초기 상태에 맞게 셋업

    // 뷰포트 크기 변화 감지 시 다시 셋업
    mediaQuery.addEventListener('change', setupObserver);

    return () => {
      if (observer) observer.disconnect();
      mediaQuery.removeEventListener('change', setupObserver);
    };
  });
</script>

{#if profile}
  <div class="dual-panel">
    <div bind:this={originRef as HTMLDivElement}>
      <ArkGridCoreEditPanel {profile} />
    </div>
    <div bind:this={otherRef as HTMLDivElement}>
      <ArkGridAllGemListPanel gems={profile.gems} />
    </div>
  </div>
  <SolvePanel bind:profile></SolvePanel>
{/if}
