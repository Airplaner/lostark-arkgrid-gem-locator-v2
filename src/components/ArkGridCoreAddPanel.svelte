<script lang="ts">
  import { ArkGridAttr, ArkGridGrade } from '../lib/constants/enums';
  import { ArkGridCoreType, createCore, getDefaultCoreCoeff } from '../lib/models/arkGridCores';
  import { arkGridCores, initArkGridCores } from '../stores/store';
  import ArkgridGemAddPanel from './ArkGridGemAddPanel.svelte';

  const attrs = Object.values(ArkGridAttr);
  const ctypes = Object.values(ArkGridCoreType);
  const grades = Object.values(ArkGridGrade);

  function createNewCore(attr: ArkGridAttr, ctype: ArkGridCoreType) {
    // 코어가 없을 때 새로운 코어 추가
    // 기본 영웅 등급
    arkGridCores.update((cores) => {
      cores[attr][ctype] = createCore(attr, ctype, ArkGridGrade.EPIC);
      return cores;
    });
  }
  function resetAllCores() {
    // 모든 코어 초기화
    arkGridCores.set(initArkGridCores());
    // arkGridCores.reset(); // 이상하게 안 됨
    return;
  }
  function resetCoeffWhenGradeChanges(
    attr: ArkGridAttr,
    ctype: ArkGridCoreType,
    grade: ArkGridGrade
  ) {
    arkGridCores.update((cores) => {
      const core = cores[attr][ctype];
      if (!core) return cores;
      core.coeff = getDefaultCoreCoeff(attr, ctype, grade);
      return cores;
    });
  }
</script>

<div class="panel">
  <button on:click={resetAllCores}>초기화</button>
  {#each attrs as attr}
    {#each ctypes as ctype}
      <div class="core-slot">
        <div class="title">
          {attr}의 {ctype} 코어
        </div>

        {#if $arkGridCores[attr][ctype]}
          <div class="core-info">
            <div class="grade">
              <span class="title">코어 등급</span>
              {#each grades as grade}
                <label>
                  <input
                    type="radio"
                    name="{attr} {ctype} grade"
                    bind:group={$arkGridCores[attr][ctype].grade}
                    on:change={() => resetCoeffWhenGradeChanges(attr, ctype, grade)}
                    value={grade}
                  />
                  {grade}
                </label>
              {/each}
            </div>

            <div class="coeff">
              <span class="title">계수</span>
              {#each [10, 14, 17, 18, 19, 20] as i}
                {i}P:
                <label>
                  <input class="core-coeff" bind:value={$arkGridCores[attr][ctype].coeff[i]} />
                </label>
              {/each}
            </div>
          </div>
        {:else}
          <button on:click={() => createNewCore(attr, ctype)}>+</button>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  .panel .core-coeff {
    width: 30px;
  }
</style>
