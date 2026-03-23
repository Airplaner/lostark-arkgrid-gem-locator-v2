<script lang="ts">
  import { onDestroy } from 'svelte';

  import { ArkGridAttrs } from '../lib/constants/enums';
  import { ArkGridCoreTypes } from '../lib/models/arkGridCores';
  import type { ArkGridGem } from '../lib/models/arkGridGems';
  import { SolverController } from '../lib/solver/solverController';
  import { appLocale } from '../lib/state/locale.state.svelte';
  import {
    type CharacterProfile,
    updateAdditionalGemResult,
    updateAnswerCores,
    updateNeedLauncherGem,
    updateScoreSet,
    updateSolveAnswer,
  } from '../lib/state/profile.state.svelte';
  import SolveCoreEdit from './SolveCoreEdit.svelte';
  import SolveResult from './SolveResult/SolveResult.svelte';

  type Props = {
    profile: CharacterProfile;
  };
  let { profile = $bindable() }: Props = $props();

  let locale = $derived(appLocale.current);
  const LTitle = $derived(
    {
      ko_kr: '최적화 설정',
      en_us: 'Optimization Settings',
    }[locale]
  );
  const LSubtitle = $derived(
    {
      ko_kr: '코어별 최소 포인트 설정',
      en_us: 'Minimum Core Points',
    }[locale]
  );
  const LRunSolve = $derived(
    {
      ko_kr: '최적화 실행',
      en_us: 'Run Optimization',
    }[locale]
  );
  const LRunning = $derived(
    {
      ko_kr: '계산 중...',
      en_us: 'Optimizing...',
    }[locale]
  );
  const LFailed = $derived(
    {
      ko_kr: '목표 포인트를 조절해보세요.',
      en_us: 'Please adjust the minimum core points.',
    }[locale]
  );
  const LOrderFailed = $derived(
    {
      ko_kr: '질서 배치 실패',
      en_us: 'Order cores optimization failed',
    }[locale]
  );
  const LChaosFailed = $derived(
    {
      ko_kr: '혼돈 배치 실패',
      en_us: 'Chaos cores optimization failed',
    }[locale]
  );

  let failedSign = $derived.by(() => {
    // 배치 실패 여부 반환
    if (profile.solveInfo.after) {
      const answerCores = profile.solveInfo.after.answerCores;
      const solveAnswer = profile.solveInfo.after.solveAnswer;

      // 코어가 애초에 없으면 실패를 안 함
      const allOrderCoresNull =
        !answerCores || Object.values(answerCores['질서']).every((v) => v == null);
      const allChaosCoresNull =
        !answerCores || Object.values(answerCores['혼돈']).every((v) => v == null);

      return {
        order: solveAnswer?.gemSetPackTuple.gsp1 === null && !allOrderCoresNull,
        chaos: solveAnswer?.gemSetPackTuple.gsp2 === null && !allChaosCoresNull,
      };
    }
    return {
      order: false,
      chaos: false,
    };
  });
  const solverController = new SolverController();
  let isSolving = $state(false);

  onDestroy(() => {
    solverController.destroy();
  });

  function cloneAssignedGem(gem: ArkGridGem, coreIndex: number): ArkGridGem {
    return JSON.parse(JSON.stringify({ ...gem, assign: coreIndex }));
  }

  function buildAssignedGems(assignedGemIndexes: number[][]): ArkGridGem[][] {
    const orderGems = profile.gems.orderGems;
    const chaosGems = profile.gems.chaosGems;
    const gemPools = [orderGems, orderGems, orderGems, chaosGems, chaosGems, chaosGems];

    return assignedGemIndexes.map((indexes, coreIndex) =>
      indexes.map((gemIndex) => cloneAssignedGem(gemPools[coreIndex][gemIndex], coreIndex))
    );
  }

  async function runSolve() {
    if (isSolving) return;

    isSolving = true;
    try {
      const result = await solverController.runSolve(profile);

      updateSolveAnswer({
        assignedGems: buildAssignedGems(result.assignedGemIndexes),
        gemSetPackTuple: result.gemSetPackTuple,
      });
      updateScoreSet(result.scoreSet);
      updateAnswerCores(JSON.parse(JSON.stringify(profile.cores)));
      updateAdditionalGemResult(result.additionalGemResult);
      updateNeedLauncherGem(result.needLauncherGem);
    } catch (error) {
      console.error(error);
    } finally {
      isSolving = false;
    }
  }
</script>

<div class="panel">
  <div class="title">{LTitle}</div>
  <div class="container">
    <div class="core-solve-goal-edit">
      <div class="title">{LSubtitle}</div>
      <div class="container">
        {#each Object.values(ArkGridAttrs) as attr}
          {#each Object.values(ArkGridCoreTypes) as ctype}
            <SolveCoreEdit {attr} {ctype} bind:core={profile.cores[attr][ctype]}></SolveCoreEdit>
          {/each}
        {/each}
      </div>
    </div>
    {#if failedSign.order || failedSign.chaos}
      <div class="failed-sign">
        {#if failedSign.order}
          <div class="big">⚠️ {LOrderFailed} ⚠️</div>
        {/if}
        {#if failedSign.chaos}
          <div class="big">⚠️ {LChaosFailed} ⚠️</div>
        {/if}
        <div class="small">{LFailed}</div>
      </div>
    {/if}
    <button class="solve-button" onclick={runSolve} disabled={isSolving} data-track="run-solve"
      >{isSolving ? LRunning : LRunSolve}</button
    >
    {#if profile.solveInfo.after}
      <SolveResult solveAfter={profile.solveInfo.after}></SolveResult>
    {/if}
  </div>
</div>

<style>
  .panel {
    min-height: 60rem;
  }
  .solve-button {
    font-size: 1.5rem;
    width: 15rem;
    height: 4rem;
    align-self: center;
  }

  .panel > .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .core-solve-goal-edit {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem;
  }
  .core-solve-goal-edit > .title {
    font-size: 1.4rem;
    font-weight: 500;
    /* text-align: center; */
  }
  .core-solve-goal-edit > .container {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .failed-sign {
    background: var(--card);
    border-radius: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  .failed-sign > .big {
    font-weight: 500;
    font-size: 1.2rem;
  }
  .failed-sign > .small {
    font-size: 1rem;
  }
</style>
