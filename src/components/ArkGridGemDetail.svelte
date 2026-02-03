<script lang="ts">
  import imgCorePoint from '../assets/corepoint.png';
  import imgWillPower from '../assets/willpower.png';
  import { type ArkGridGem, getGemImage } from '../lib/models/arkGridGems';
  import { deleteGem } from '../lib/state/profile.state.svelte';

  interface Props {
    gem: ArkGridGem;
    showDeleteButton?: boolean;
  }

  let { gem, showDeleteButton = true }: Props = $props();
</script>

<div class="gem-box">
  <div class="gem">
    <div class="col gemImage" data-grade={gem.grade}>
      <img src={getGemImage(gem.gemAttr, gem.name)} alt={gem.name} />
    </div>
    <div class="col main-options">
      <div class="main-option">
        <span> {gem.req}</span>
        <img src={imgWillPower} alt="W" />
      </div>
      <div class="main-option">
        {gem.point}<img src={imgCorePoint} alt="P" />
      </div>
    </div>
    <div class="vl"></div>
    <div class="col sub-options">
      <div class="sub-option">
        <span class="option-type">
          {gem.option1.optionType}
        </span>
        <span class="option-level">
          Lv.{gem.option1.value}
        </span>
      </div>
      <div class="sub-option">
        <span class="option-type">
          {gem.option2.optionType}
        </span>
        <span class="option-level">
          Lv.{gem.option2.value}
        </span>
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
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    display: inline-flex;
    height: 3rem;
    padding: 0.4rem;
    justify-content: space-between;
    align-items: center;
  }
  .gem-box .edit-button {
    flex: 0 0 auto;
  }
  .gem {
    /* min-width: 12rem; */
    max-width: 30rem;
    height: 100%;

    /* 디버깅 */
    /* border: 1px solid blue; */

    /* 내부 요소 */
    display: flex;
    /* justify-content: space-between; */
    align-items: center;

    overflow: hidden;
    overflow-y: hidden;

    flex-grow: 1;
    flex-shrink: 0;
    /* 외관 */
  }
  .gem > .col.main-options > .main-option {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .gem > .col.main-options img {
    display: block;
    height: 80%;

    /* 살짝 올라가보이는 것을 보정 */
    transform: translateY(1px);
  }
  .gem > .col.gemImage {
    flex: 1;
    min-width: 1.5rem;
    max-width: 2.5rem;
  }
  .gem > .col > img {
    height: 100%;
    object-fit: contain;
    transform: translateX(1px);
  }

  .gem > .col.main-options {
    flex: 1;
    min-width: 1.5rem;
    max-width: 2.5rem;
  }

  .gem > .vl {
    width: 0px;
    border-left: 1px solid rgb(156, 156, 156);
    height: 80%;
    justify-content: center;
  }

  .gem > .col.sub-options {
    flex: 4;
    min-width: 2rem;
  }
  .gem > .col.sub-options > .sub-option {
    /* 아군 공격 강화 Lv.3  이런 문구는 반드시 한 줄 */
    white-space: nowrap;
  }

  .gem > .col {
    /* 디버깅 */
    /* border: 1px solid red; */
    /* 외관 */
    height: 100%;
    margin: 0.5rem;

    /* 내부 요소들은 중앙 정렬 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.1em;
    flex-wrap: nowrap;
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
