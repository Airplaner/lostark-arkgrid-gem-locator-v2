<script lang="ts">
  import { type ArkGridAttr, ArkGridAttrs } from '../lib/constants/enums';
  import {
    type ArkGridCoreType,
    ArkGridCoreTypes,
  } from '../lib/models/arkGridCores';
  import {
    type ArkGridGem,
    ArkGridGemOptionTypes,
  } from '../lib/models/arkGridGems';
  import { Core, Gem } from '../lib/solver/models';
  import { getPossibleGemSets } from '../lib/solver/solver';
  import { globalAppConfig } from '../lib/store';
  import SolveCoreEdit from './SolveCoreEdit.svelte';

  const coreComponents: Record<
    ArkGridAttr,
    Record<ArkGridCoreType, SolveCoreEdit | null>
  > = Object.fromEntries(
    Object.values(ArkGridAttrs).map((attr) => [
      attr,
      Object.fromEntries(
        Object.values(ArkGridCoreTypes).map((type) => [type, null])
      ),
    ])
  ) as Record<ArkGridAttr, Record<ArkGridCoreType, SolveCoreEdit | null>>;

  function convertToSolverGems(gem: ArkGridGem[]): Gem[] {
    // Svelte에서 사용하는 ArkGridGem을 solver가 사용하는 형태로 변경
    return gem.map((g, index) => {
      let att = 0,
        boss = 0,
        skill = 0;

      switch (g.option1.optionType) {
        case ArkGridGemOptionTypes.ATTACK:
          att = g.option1.value;
          break;
        case ArkGridGemOptionTypes.SKILL_DAMAGE:
          skill = g.option1.value;
          break;
        case ArkGridGemOptionTypes.BOSS_DAMAGE:
          boss = g.option1.value;
          break;
        default:
          break;
      }
      switch (g.option2.optionType) {
        case ArkGridGemOptionTypes.ATTACK:
          att = g.option2.value;
          break;
        case ArkGridGemOptionTypes.SKILL_DAMAGE:
          skill = g.option2.value;
          break;
        case ArkGridGemOptionTypes.BOSS_DAMAGE:
          boss = g.option2.value;
          break;
        default:
          break;
      }
      return new Gem(BigInt(index), g.req, g.point, att, skill, boss);
    });
  }

  function solve() {
    const orderCores: Core[] = [];
    const chaosCores: Core[] = [];
    for (const attr of Object.values(ArkGridAttrs)) {
      for (const ctype of Object.values(ArkGridCoreTypes)) {
        const core = coreComponents[attr][ctype];
        if (!core) continue;
        const targetCores =
          attr === ArkGridAttrs.Order ? orderCores : chaosCores;
        targetCores.push(core.convertToSolverCore());
      }
    }
    console.log('코어들');
    console.log(orderCores);
    console.log(chaosCores);

    const orderGems = convertToSolverGems(globalAppConfig.current.orderGems);
    const chaosGems = convertToSolverGems(globalAppConfig.current.orderGems);

    console.log('젬들');
    console.log(orderGems);
    console.log(chaosGems);

    const orderGss = orderCores.map((c) => {
      return getPossibleGemSets(c, orderGems);
    });
    const chaosGss = chaosCores.map((c) => {
      return getPossibleGemSets(c, chaosGems);
    });

    console.log('GemSet들');
    console.log(orderGss);
    console.log(chaosGss);
  }
</script>

<div class="panel">
  <div class="core-goal-panel">
    {#each Object.values(ArkGridAttrs) as attr}
      {#each Object.values(ArkGridCoreTypes) as ctype}
        {#if globalAppConfig.current.cores[attr][ctype]}
          <SolveCoreEdit
            core={globalAppConfig.current.cores[attr][ctype]}
            bind:this={coreComponents[attr][ctype]}
          ></SolveCoreEdit>
        {:else}
          <span> NO </span>
        {/if}
      {/each}
    {/each}
  </div>
  <button onclick={solve}> Solve!</button>
</div>
