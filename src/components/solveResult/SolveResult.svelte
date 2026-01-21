<script lang="ts">
  import { type ArkGridAttr } from '../../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreType,
  } from '../../lib/models/arkGridCores';
  import type { SolveAnswer, SolveAnswerScoreSet } from '../SolvePanel.svelte';
  import CoreGemEquippedList from './CoreGemEquippedList.svelte';
  import GemOptionStats from './GemOptionStats.svelte';
  import ScoreIndicator from './ScoreIndicator.svelte';

  type Props = {
    answerCores: Record<
      ArkGridAttr,
      Record<ArkGridCoreType, ArkGridCore | null>
    >;
    scoreSet: SolveAnswerScoreSet;
    solveAnswer: SolveAnswer;
  };
  let { answerCores, scoreSet, solveAnswer }: Props = $props();
</script>

<div class="root">
  <div class="title"></div>
  <div class="container">
    <div class="left">
      <ScoreIndicator {scoreSet}></ScoreIndicator>
      <GemOptionStats {solveAnswer}></GemOptionStats>
    </div>
    <CoreGemEquippedList {answerCores} {solveAnswer}></CoreGemEquippedList>
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .title {
    text-align: center;
  }
  .container {
    display: flex;
    flex-direction: row;
    gap: 2rem;
  }
  .root .title {
    font-size: 1.5rem;
    font-weight: 500;
  }
  .left {
    display: flex;
    flex-direction: column;
    /* justify-content: center; */
    align-items: center;
    gap: 2rem;
  }
  @media (max-width: 960px) {
    .container {
      flex-direction: column;
    }
  }
</style>
