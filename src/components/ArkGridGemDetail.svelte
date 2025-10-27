<script lang="ts">
  import { ArkGridAttr } from '../lib/constants/enums';
  import type { ArkGridGem } from '../lib/models/arkGridGems';

  const gemImages = import.meta.glob<string>('../assets/gems/*.png', {
    eager: true, // 바로 import (비동기 아님)
    import: 'default', // 각 파일의 기본 export 경로 사용
  });
  const MapGemNameImage: Record<string, string> = {
    '질서의 젬 : 안정': 'order_0',
    '질서의 젬 : 견고': 'order_1',
    '질서의 젬 : 불변': 'order_2',
    '혼돈의 젬 : 침식': 'chaos_0',
    '혼돈의 젬 : 왜곡': 'chaos_1',
    '혼돈의 젬 : 붕괴': 'chaos_2',
  };
  function getGemImage(gem: ArkGridGem): string {
    if (!gem.name) {
      return gem.gemAttr == ArkGridAttr.Order
        ? '/src/assets/gems/order_0.png'
        : '/src/assets/gems/chaos_0.png';
    }
    return `/src/assets/gems/${MapGemNameImage[gem.name] ?? 'order_0'}.png`;
  }

  interface Props {
    gem: ArkGridGem;
  }

  let { gem }: Props = $props();
</script>

<div class="gem-box">
  <div class="gem">
    <div class="col image">
      <img src={getGemImage(gem)} alt={gem.name} />
    </div>
    <div class="col main-options">
      <div>
        {gem.req}W
      </div>
      <div>
        {gem.point}P
      </div>
    </div>
    <div class="vl"></div>
    <div class="col sub-options">
      <div>
        {gem.option1.optionType} Lv.{gem.option1.value}
      </div>
      <div>
        {gem.option2.optionType} Lv.{gem.option2.value}
      </div>
    </div>
  </div>
</div>

<style>
  .gem-box {
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    display: flex;
    height: 3rem;
    padding: 0.4rem;
  }
  .gem {
    /* min-width: 12rem; */
    max-width: 30rem;
    width: 100%;
    height: 100%;

    /* 디버깅 */
    /* border: 1px solid blue; */

    /* 내부 요소 */
    display: flex;
    /* justify-content: space-between; */
    align-items: center;

    overflow: hidden;
    overflow-y: hidden;

    flex-shrink: 0;
    /* 외관 */
  }
  .gem > .col.image {
    flex: 1;
    min-width: 1.5rem;
  }
  .gem > .col.main-options {
    flex: 1;
    min-width: 1.5rem;
  }
  .gem > .vl {
    flex: 0.1;
    min-width: 0.1rem;
    border-left: 1px solid rgb(156, 156, 156);
    height: 80%;
    justify-content: center;
    /* margin-right: 0.3rem; */
  }
  .gem > .col.sub-options {
    flex: 8;
    min-width: 9rem;
  }
  .gem > .col > img {
    height: 90%;
    object-fit: contain;
  }
  .gem > .col {
    /* 디버깅 */
    /* border: 1px solid red; */
    /* 외관 */
    /* height: 100%; */
    margin: 0.5rem;

    /* 내부 요소들은 중앙 정렬 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.18em;
  }
</style>
