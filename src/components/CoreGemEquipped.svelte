<script lang="ts">
  import {
    type ArkGridCore,
    getDefaultCoreEnergy,
  } from '../lib/models/arkGridCores';
  import {
    type ArkGridGem,
    ArkGridGemOptionTypes,
  } from '../lib/models/arkGridGems';
  import ArkGridGemDetail from './ArkGridGemDetail.svelte';

  let { core, gems }: { core: ArkGridCore | null; gems: ArkGridGem[] } =
    $props();

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
      {core?.attr}의 {core?.type}
    </div>
  </div>
  <div>
    <div>포인트: {corePoint}P</div>
    <div>의지력: {usedPower}/{getDefaultCoreEnergy(core)}</div>
    <div hidden>
      <p>공격력: {totalAtt}</p>
      <p>추가 피해: {totalSkill}</p>
      <p>보스 피해: {totalBoss}</p>
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
    width: 20rem;
    display: flex;
    flex-direction: column;
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
</style>
