<script lang="ts">
  import SolvePanel from '../SolvePanel.svelte';

  type ScoreSet = {
    score: number;
    bestScore: number;
    perfectScore: number;
  };

  let { scoreSet } = $props<{ scoreSet: ScoreSet }>();

  let scoreRatio = $derived(
    Math.min(scoreSet.score / scoreSet.perfectScore, 1)
  );
  let bestRatio = $derived(
    Math.min(scoreSet.bestScore / scoreSet.perfectScore, 1)
  );
</script>

<div class="root">
  <div class="title">코어력</div>
  <div class="score-wrapper">
    <div class="score-bar">
      <div class="indicator dot" style="left:{scoreRatio * 100}%"></div>
      <div class="indicator bar" style="left:{bestRatio * 100}%"></div>
      <div class="label top" style="left:{scoreRatio * 100}%">
        {scoreSet.score.toFixed(2)}%
      </div>
      <div class="label bottom" style="left:{bestRatio * 100}%">
        {scoreSet.bestScore.toFixed(2)}%
      </div>
    </div>
  </div>
  <div>
    <div class="dot" style="display: inline-block;"></div>
    현재 전투력 %
    <br />
    <div class="bar" style="display: inline-block;"></div>
    현재 코어의 한계 전투력 %
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .root .title {
    font-weight: 500;
    font-size: 1.2rem;
  }

  .score-wrapper {
    width: 20rem;
  }
  /* 바 */
  .score-bar {
    position: relative;
    height: 6px;
    background: var(--border);
    border-radius: 6px;
  }

  .score-bar > .indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .label {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
  }
  .label.top {
    top: -1.5rem;
  }
  .label.bottom {
    top: 1.5rem;
  }

  .dot {
    width: 1rem;
    height: 1rem;
    background: var(--primary);
    border-radius: 50%;
  }

  .bar {
    width: 3px;
    height: 1.3rem;
    background: black;
  }
</style>
