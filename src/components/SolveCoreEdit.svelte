<script lang="ts">
  import type { ArkGridAttr } from '../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreCoeffs,
    type ArkGridCoreType,
    getDefaultCoreEnergy,
    getDefaultCoreGoalPoint,
  } from '../lib/models/arkGridCores';
  import { Core } from '../lib/solver/models';

  interface Props {
    core: ArkGridCore;
  }
  let { core } = $props();

  let energy = $state(0);
  let point = $state(0);

  $effect(() => {
    energy = getDefaultCoreEnergy(core);
    point = getDefaultCoreGoalPoint(core);
  });

  function buildCoreArray(coeffs: ArkGridCoreCoeffs): number[] {
    const arr = new Array(21).fill(0);
    arr.fill(coeffs.p10, 10, 14);
    arr.fill(coeffs.p14, 14, 17);
    arr[17] = coeffs.p17;
    arr[18] = coeffs.p18;
    arr[19] = coeffs.p19;
    arr[20] = coeffs.p20;
    return arr;
  }
  export function convertToSolverCore(): Core {
    return new Core(energy, point, buildCoreArray(core.coeffs));
  }
</script>

<div class="core-goal">
  {#if !core}
    <span>NO</span>
  {:else}
    <div>
      <span>
        {core.attr}의 {core.type}
      </span>
    </div>
    <div>
      <label>
        의지력
        <input type="number" bind:value={energy} />
      </label>
      <label>
        목표
        <input type="number" bind:value={point} />
      </label>
    </div>
  {/if}
</div>
