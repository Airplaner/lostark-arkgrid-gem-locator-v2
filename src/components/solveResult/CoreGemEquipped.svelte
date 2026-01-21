<script lang="ts">
  import type { ArkGridAttr } from '../../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreType,
    getDefaultCoreEnergy,
  } from '../../lib/models/arkGridCores';
  import {
    type ArkGridGem,
    ArkGridGemOptionTypes,
  } from '../../lib/models/arkGridGems';
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
  let totalAtt = $derived.by(() => {
    return gems.reduce((sum, gem) => {
      return (
        sum +
        (gem.option1.optionType == ArkGridGemOptionTypes.ATTACK
          ? gem.option1.value
          : 0) +
        (gem.option2.optionType == ArkGridGemOptionTypes.ATTACK
          ? gem.option2.value
          : 0)
      );
    }, 0);
  });
  let totalSkill = $derived.by(() => {
    return gems.reduce((sum, gem) => {
      return (
        sum +
        (gem.option1.optionType == ArkGridGemOptionTypes.SKILL_DAMAGE
          ? gem.option1.value
          : 0) +
        (gem.option2.optionType == ArkGridGemOptionTypes.SKILL_DAMAGE
          ? gem.option2.value
          : 0)
      );
    }, 0);
  });
  let totalBoss = $derived.by(() => {
    return gems.reduce((sum, gem) => {
      return (
        sum +
        (gem.option1.optionType == ArkGridGemOptionTypes.BOSS_DAMAGE
          ? gem.option1.value
          : 0) +
        (gem.option2.optionType == ArkGridGemOptionTypes.BOSS_DAMAGE
          ? gem.option2.value
          : 0)
      );
    }, 0);
  });
</script>

<div class="root">
  <div class="title">
    <div class="name">
      {attr}의 {ctype}
    </div>
  </div>
  <div class="core-point-and-power">
    <div class="item" hidden={!core}>포인트 {corePoint}</div>
    <div class="item" hidden={!core}>
      의지력 {usedPower}/{getDefaultCoreEnergy(core)}
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
