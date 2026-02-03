<script lang="ts">
  import { type ArkGridAttr, ArkGridAttrTypes } from '../../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreType,
    ArkGridCoreTypeTypes,
    getDefaultCoreEnergy,
  } from '../../lib/models/arkGridCores';
  import { type ArkGridGem, ArkGridGemOptionTypes } from '../../lib/models/arkGridGems';
  import { appConfig } from '../../lib/state/appConfig.state.svelte';
  import ArkGridGemDetail from '../ArkGridGemDetail.svelte';

  let {
    attr,
    ctype,
    core,
    gems,
  }: {
    attr: ArkGridAttr;
    ctype: ArkGridCoreType;
    core: ArkGridCore | null;
    gems: ArkGridGem[];
  } = $props();

  let corePoint = $derived.by(() => {
    return gems.reduce((sum, gem) => {
      return sum + gem.point;
    }, 0);
  });
  let usedPower = $derived.by(() => {
    return gems.reduce((sum, gem) => {
      return sum + gem.req;
    }, 0);
  });
  let locale = $derived(appConfig.current.locale);
  const LTitle = $derived(
    locale == 'ko_kr'
      ? `${attr}의 ${ctype}`
      : `${ArkGridAttrTypes[attr].name[locale]} of the ${ArkGridCoreTypeTypes[ctype].name[locale]}`
  );
  const LPoint = $derived(
    {
      ko_kr: '포인트',
      en_us: 'Points',
    }[locale]
  );
  const LCosts = $derived(
    {
      ko_kr: '의지력',
      en_us: 'Costs',
    }[locale]
  );
</script>

<div class="root">
  <div class="title">
    <div class="name">
      {LTitle}
    </div>
  </div>
  <div class="core-point-and-power">
    <div class="item" hidden={!core}>{LPoint} {corePoint}</div>
    <div class="item" hidden={!core}>
      {LCosts}
      {usedPower}/{getDefaultCoreEnergy(core)}
    </div>
  </div>
  <div class="gems">
    {#each gems as gem}
      <ArkGridGemDetail {gem} showDeleteButton={false}></ArkGridGemDetail>
    {/each}
  </div>
</div>

<style>
  .root {
    width: 18rem;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    height: 22rem;

    border: 1px solid var(--border);
    border-radius: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .title {
    font-weight: 500;
    font-size: 1.2rem;
    align-self: center;
  }
  .gems {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .core-point-and-power {
    font-size: 0.9rem;
    align-self: center;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
  }
  .core-point-and-power > .item {
    padding: 0.5rem;
  }
  @media (max-width: 960px) {
    .root {
      /* 모바일일 땐 굳이 높이 지킬 필요 없음 */
      height: 0%;
    }
  }
</style>
