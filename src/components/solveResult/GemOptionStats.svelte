<script lang="ts">
  import type { AppLocale } from '../../lib/constants/enums';
  import {
    type ArkGridGemOptionName,
    ArkGridGemOptionNames,
    ArkGridGemOptionTypes,
  } from '../../lib/models/arkGridGems';
  import { appConfig } from '../../lib/state/appConfig.state.svelte';
  import type { SolveAnswer } from '../../lib/state/profile.state.svelte';

  type Props = {
    solveAnswer: SolveAnswer;
  };
  let { solveAnswer }: Props = $props();
  let answerStatistics: Record<ArkGridGemOptionName, number> = $derived.by(() => {
    let statistics = {
      공격력: 0,
      '보스 피해': 0,
      '추가 피해': 0,
      낙인력: 0,
      '아군 공격 강화': 0,
      '아군 피해 강화': 0,
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
  let locale: AppLocale = $derived(appConfig.current.locale);
</script>

<div class="root">
  <div class="title">젬 옵션</div>
  <div class="container">
    {#each Object.entries(ArkGridGemOptionTypes) as [optionName, optionType]}
      <div class="item">
        {optionType.name[locale]} Lv. {answerStatistics[optionName as ArkGridGemOptionName]}
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
