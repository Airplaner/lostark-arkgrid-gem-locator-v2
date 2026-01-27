<script lang="ts">
  import { type ArkGridGemOptionType, ArkGridGemOptionTypes } from '../../lib/models/arkGridGems';
  import type { SolveAnswer } from '../../lib/state/profile.state.svelte';

  type Props = {
    solveAnswer: SolveAnswer;
  };
  let { solveAnswer }: Props = $props();
  let answerStatistics: Record<ArkGridGemOptionType, number> = $derived.by(() => {
    let statistics = {
      [ArkGridGemOptionTypes.ATTACK]: 0,
      [ArkGridGemOptionTypes.BOSS_DAMAGE]: 0,
      [ArkGridGemOptionTypes.SKILL_DAMAGE]: 0,
      [ArkGridGemOptionTypes.STIGMA]: 0,
      [ArkGridGemOptionTypes.PARTY_ATTACK]: 0,
      [ArkGridGemOptionTypes.PARTY_DAMAGE]: 0,
    };
    if (!solveAnswer) return statistics;
    for (const gems of solveAnswer.assignedGems) {
      for (const gem of gems) {
        statistics[gem.option1.optionType] += gem.option1.value;
        statistics[gem.option2.optionType] += gem.option2.value;
      }
    }
    return statistics;
  });
</script>

<div class="root">
  <div class="title">젬 옵션</div>
  <div class="container">
    {#each Object.values(ArkGridGemOptionTypes) as optionType}
      <div class="item">
        {optionType} Lv. {answerStatistics[optionType]}
      </div>
    {/each}
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 20rem;
    box-sizing: border-box;
  }
  .title {
    font-weight: 500;
    font-size: 1.4em;
  }
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.2rem;
  }
  .item {
    /* border: 1px black solid; */
    background-color: var(--border);
    padding: 0.5rem;
  }
</style>
