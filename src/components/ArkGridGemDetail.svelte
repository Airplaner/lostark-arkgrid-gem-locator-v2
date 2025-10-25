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

<div class="gem">
  <div class="col">
    <img src={getGemImage(gem)} alt={gem.name} />
  </div>
  <div class="col">
    <div>
      {gem.req}W
    </div>
    <div>
      {gem.point}P
    </div>
  </div>
  <div class="vl"></div>
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
    flex-shrink: 0;
    /* 외관 */
    border-radius: 0.4rem;
    border: 1px solid var(--border);

    min-width: 24rem;
    max-width: 40rem;
    height: 4rem;

    /* 내부 요소 */
    display: flex;
    align-items: center;

    padding: 0.4rem;

    overflow: hidden;
  }
  .gem > .col > img {
    height: 90%;
  }
  .gem > .col {
    /* 외관 */
    height: 100%;
    min-width: 2rem;
    margin: 1rem;

    /* 내부 요소들은 중앙 정렬 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.18em;
  }
  .vl {
    border-left: 1px solid rgb(156, 156, 156);
    height: 80%;
    justify-content: center;
    min-width: 0.1rem;
    margin-right: 0.3rem;
  }
</style>
