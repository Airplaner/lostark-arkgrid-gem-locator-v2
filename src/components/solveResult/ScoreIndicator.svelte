<script lang="ts">
  import { appConfig } from '../../lib/state/appConfig.state.svelte';
  import SolvePanel from '../SolvePanel.svelte';

  type ScoreSet = {
    score: number;
    bestScore: number;
    perfectScore: number;
  };

  let { scoreSet } = $props<{ scoreSet: ScoreSet }>();

  let scoreRatio = $derived(Math.min(scoreSet.score / scoreSet.perfectScore, 1));
  let bestRatio = $derived(Math.min(scoreSet.bestScore / scoreSet.perfectScore, 1));
  let locale = $derived(appConfig.current.locale);
  const LTitle = $derived(
    {
      ko_kr: '아크 그리드 전투력',
      en_us: 'Ark Grid Combat Power',
    }[locale]
  );
  const LCurrent = $derived(
    {
      ko_kr: '현재 전투력 증가%',
      en_us: 'Current Combat Power %',
    }[locale]
  );
  const LMaximum = $derived(
    {
      ko_kr: '현재 코어의 전투력 증가% 한계',
      en_us: 'Maximum Combat Power % with current cores',
    }[locale]
  );
</script>

<div class="root">
  <div class="title">{LTitle}</div>
  <div class="score-wrapper">
    <div class="score-bar">
      <div class="indicator dot moving" style="--target-left:{scoreRatio * 100}%"></div>
      <div class="indicator bar moving" style="--target-left:{bestRatio * 100}%"></div>
      <div class="label top moving" style="--target-left:{scoreRatio * 100}%">
        {scoreSet.score.toFixed(2)}%
      </div>
      <div class="label bottom moving" style="--target-left:{bestRatio * 100}%">
        {scoreSet.bestScore.toFixed(2)}%
      </div>
    </div>
  </div>
  <div class="legend">
    <div class="row">
      <div class="icon">
        <div class="dot"></div>
      </div>
      <div>{LCurrent}</div>
    </div>

    <div class="row">
      <div class="icon">
        <div class="bar"></div>
      </div>
      <div>{LMaximum}</div>
    </div>
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
    font-size: 1.4rem;
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
    background-color: var(--anti-bg);
  }

  .score-bar > .moving {
    animation: move-left 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes move-left {
    from {
      left: 0%;
    }
    to {
      left: var(--target-left);
    }
  }

  .legend {
    padding-left: 0.2rem;
  }
  .legend > .row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend > .row > .icon {
    width: 1rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
