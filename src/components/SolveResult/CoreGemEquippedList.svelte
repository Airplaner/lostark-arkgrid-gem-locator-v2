<script lang="ts">
  import { type ArkGridAttr, ArkGridAttrs } from '../../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreType,
    ArkGridCoreTypes,
  } from '../../lib/models/arkGridCores';
  import type { SolveAnswer } from '../../lib/state/profile.state.svelte';
  import CoreGemEquipped from './CoreGemEquipped.svelte';

  type Props = {
    answerCores: Record<ArkGridAttr, Record<ArkGridCoreType, ArkGridCore | null>>;
    solveAnswer: SolveAnswer;
    attr?: ArkGridAttr;
  };
  let { answerCores, solveAnswer, attr }: Props = $props();
  const attrs = $derived(attr ? [attr] : Object.values(ArkGridAttrs));
</script>

<div class="root">
  {#each attrs as a}
    {@const attrIndex = Object.values(ArkGridAttrs).indexOf(a)}
    {#each Object.values(ArkGridCoreTypes) as ctype, j}
      <CoreGemEquipped
        attr={a}
        {ctype}
        core={answerCores[a][ctype]}
        gems={solveAnswer.assignedGems[attrIndex * 3 + j]}
      ></CoreGemEquipped>
    {/each}
  {/each}
</div>

<style>
  .root {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: center;
  }
</style>
