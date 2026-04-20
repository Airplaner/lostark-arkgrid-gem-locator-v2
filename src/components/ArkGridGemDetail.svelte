<script lang="ts">
  import imgCorePoint from '../assets/corepoint.png';
  import imgWillPower from '../assets/willpower.png';
  import type { AppLocale } from '../lib/constants/enums';
  import { type ArkGridGem, ArkGridGemOptionTypes, getGemImage } from '../lib/models/arkGridGems';
  import { appLocale } from '../lib/state/locale.state.svelte';
  import { deleteGem } from '../lib/state/profile.state.svelte';
  import { scoreGem } from '../lib/models/gemScore';

  interface Props {
    gem: ArkGridGem;
    showDeleteButton?: boolean;
    showGemScore?: boolean;
  }

  let { gem, showDeleteButton = true, showGemScore = true }: Props = $props();
  let locale: AppLocale = $derived(appLocale.current);
  let score = scoreGem(gem);
</script>

<div class="gem-box">
  <div class="gem" data-locale={locale}>
    <div class="gem-image" data-grade={gem.grade}>
      <img src={getGemImage(gem.gemAttr, gem.name)} alt={gem.name} />
      {#if showGemScore}
        <div class="score" style="color: {score<5 ? 'red' : score>15 ? 'yellow' : score>10 ? 'light-green' : 'white'}">{score.toFixed(2)}</div>
      {/if}
    </div>

    <div class="willPower gem-spec">
      <div class="text">{gem.req}</div>
      <img src={imgWillPower} alt="W" />
    </div>

    <div class="vl"></div>

    <div class="option1 gem-spec">
      <div class="text shrinkable">
        {ArkGridGemOptionTypes[gem.option1.optionType].name[locale]}
      </div>
      <div class="text">
        Lv. {gem.option1.value}
      </div>
    </div>

    <div class="corePoint gem-spec">
      <div class="text">
        {gem.point}
      </div>
      <img src={imgCorePoint} alt="P" />
    </div>

    <div class="option2 gem-spec">
      <div class="text shrinkable">
        {ArkGridGemOptionTypes[gem.option2.optionType].name[locale]}
      </div>
      <div class="text">
        Lv. {gem.option2.value}
      </div>
    </div>
  </div>
  {#if showDeleteButton}
    <div class="edit-button">
      <button onclick={() => deleteGem(gem)}>🗑️</button>
    </div>
  {/if}
</div>

<style>
  .gem-box {
    container-type: inline-size;
    /* scroll-snap-align: start; */
    border: 1px solid var(--border);
    border-radius: 0.4rem;

    min-width: 15rem;
    max-width: 40rem;
    overflow-x: hidden;

    height: 3rem;
    min-height: 3rem;
    max-height: 3rem;

    display: flex;
    align-items: stretch;
    padding: 0.4rem;
    overflow-y: hidden;
  }
  .gem-box > .edit-button {
    margin-left: auto;
  }

  /* Grid 배치 */
  .gem {
    /* 내부 요소 */
    display: grid;
    /* 이미지(2.5rem) 의지력(2rem) 세로줄(1px) 공격력 Lv.5 (auto)*/
    grid-template-columns: 2.5rem 2rem min-content auto;
    grid-template-rows: 1fr 1fr;
    gap: 0 0.7rem;
    height: 100%;
  }
  @container (max-width: 300px) {
    /* CoreGemEquipped 전용 css */
    /* 영문 버전 글자가 많아서, vertical line 제거 및 약간의 margin으로 대칭 */
    .gem[data-locale='en_us'] {
      column-gap: 0.3rem;
      grid-template-columns: 2.5rem 2rem auto;
    }
    .gem[data-locale='en_us'] > .vl {
      display: none;
      height: 0%;
    }
    .gem[data-locale='en_us'] > .gem-spec {
      margin-left: 0.1rem;
    }
  }
  /* 두 칸씩 먹는 이미지와 세로선 */
  .gem-image {
    grid-column: 1;
    grid-row: 1 / span 2;
    position: relative;
  }

  .gem-image > .score {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, 60%);
    font-size: 0.7rem;
    font-weight: normal;
    text-shadow:
      -1px -1px 0 #000,
      1px -1px 0 #000,
      -1px 1px 0 #000,
      1px 1px 0 #000;
    pointer-events: none;
  }
  .gem > .vl {
    grid-column: 3;
    grid-row: 1 / span 2;
    height: 80%;
    margin: auto 0;
    border-left: 1px solid rgb(156, 156, 156);
  }

  /* 모든 젬 내부 div는 flex box */
  .gem > .gem-spec,
  .gem-image {
    display: flex;
    flex-direction: row;
    gap: 0.3rem;
    /* 상하는 중앙 정렬, 좌측으로 붙여서 */
    align-items: center;
    justify-content: flex-start;
    white-space: nowrap;
    overflow: hidden;
  }
  .gem > .gem-spec > .text {
    /* gem-spec안의 글자들이 윗공간이 남아서 살짝 올림 */
    transform: translateY(-0.075rem);
  }

  img {
    object-fit: contain;
  }
  .gem-image > img {
    /* 젬 이미지 우측으로 1px */
    width: 100%;
    transform: translateX(0.05rem);
  }
  .gem-spec > img {
    height: 80%;
  }

  .shrinkable {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  div[data-grade] {
    border-radius: 20%;
  }
  /* 공홈 코어 css*/
  div[data-grade='전설'] {
    background: linear-gradient(135deg, #4d3000, #bc7d01);
  }

  div[data-grade='유물'] {
    background: linear-gradient(135deg, #341a09, #a24006);
  }

  div[data-grade='고대'] {
    background: linear-gradient(135deg, #3d3325, #dcc999);
  }
</style>
