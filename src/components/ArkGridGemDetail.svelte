<script lang="ts">
  import type { ArkGridGem } from '../lib/models/arkGridGems';

  interface Props {
    gem: ArkGridGem;
  }

  let { gem }: Props = $props();
  const iconIndex = gem.gemAttr === '질서' ? 202 : 205;
</script>

<div class="gem">
  <div class="col">
    <img
      src="https://cdn-lostark.game.onstove.com/efui_iconatlas/use/use_13_{iconIndex}.png"
      alt="이미지"
    />
  </div>
  <div class="col">
    <div>
      {gem.req}W
    </div>
    <div>
      {gem.point}P
    </div>
  </div>
  <div class="col">
    <div>
      {gem.option1.optionType} Lv.{gem.option1.value}
    </div>
    <div>
      {gem.option2.optionType} Lv.{gem.option2.value}
    </div>
  </div>
</div>

<style>
  .gem {
    /* 외관 */
    border: 1px solid black;
    max-width: 22em;
    margin-top: 0.5em;
    padding: 0.2em 0.2em;
    height: 4em;

    /* 내부 요소 */
    display: flex;
  }
  .col > img {
    height: 100%; /* 컨테이너 높이에 맞춤 */
    width: auto; /* 가로 비율 자동 */
    object-fit: contain; /* 이미지 비율 유지, 비율 깨지지 않음 */
  }
  .gem .col {
    /* 외관 */
    min-width: 5em;
    display: flex;
    flex-direction: column;
    margin: 0.2em;

    /* 내부 요소들은 중앙 정렬 */
    justify-content: center;
    gap: 0.2em;
  }
</style>
