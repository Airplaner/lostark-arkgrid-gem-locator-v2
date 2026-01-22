<script lang="ts">
  import type { ArkGridAttr } from '../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreCoeffs,
    type ArkGridCoreType,
    getDefaultCoreEnergy,
    getDefaultCoreGoalPoint,
    getMaxCorePoint,
  } from '../lib/models/arkGridCores';
  import { Core } from '../lib/solver/models';

  interface Props {
    attr: ArkGridAttr;
    ctype: ArkGridCoreType;
    core: ArkGridCore | null;
  }
  let { attr, ctype, core }: Props = $props();

  let energy = $state(0);
  let point = $state(0);

  $effect(() => {
    energy = getDefaultCoreEnergy(core);
    point = getDefaultCoreGoalPoint(core);
  });

  let maxCorePoint = $derived(getMaxCorePoint(core));

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
  export function convertToSolverCore(): Core | null {
    if (!core) return null;
    return new Core(energy, point, buildCoreArray(core.coeffs));
  }
</script>

<div class="root">
  <div class="title">{attr}의 {ctype}</div>
  <div>
    {#if core}
      <select bind:value={point}>
        {#each [20, 19, 18, 17, 14, 10, 0] as targetPoint}
          {#if targetPoint <= maxCorePoint}
            <option value={targetPoint}>{targetPoint}</option>
          {/if}
        {/each}
      </select>
    {:else}
      <div>-</div>
    {/if}
  </div>
</div>

<style>
  .root {
    background-color: lightblue;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 1rem;
  }
  .root > .title {
    font-weight: 500;
    font-size: 1.1rem;
  }

  select {
    /* 테두리까지 포함해서 크기 계산 */
    box-sizing: border-box;
    font-size: 0.9rem;
    width: 3rem;
    text-align: center;
    border: none;
    background: none;
  }
</style>
