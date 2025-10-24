<script lang="ts">
  import { ArkGridAttr, ArkGridGrade } from '../lib/constants/enums';
  import { ArkGridCoreType, createCore, resetCoreCoeff } from '../lib/models/arkGridCores';
  import { arkGridCores, initArkGridCores } from '../stores/store';

  const attrs = Object.values(ArkGridAttr);
  const ctypes = Object.values(ArkGridCoreType);
  const grades = Object.values(ArkGridGrade);
  const coeffKeys = ['p10', 'p14', 'p17', 'p18', 'p19', 'p20'] as const;

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
  function resetCoeffWhenGradeChanges(attr: ArkGridAttr, ctype: ArkGridCoreType) {
    arkGridCores.update((cores) => {
      const core = cores[attr][ctype];
      if (!core) return cores;
      resetCoreCoeff(core);
      return cores;
    });
  }
</script>

<div class="panel">
  <button onclick={resetAllCores}>초기화</button>
  {#each attrs as attr}
    {#each ctypes as ctype}
      <div class="core-slot">
        <div class="row core-name">
          {attr}의 {ctype} 코어
        </div>

        {#if $arkGridCores[attr][ctype]}
          <div class="row core-grade">
            <span class="title">코어 등급</span>
            {#each grades as grade}
              <label>
                <input
                  type="radio"
                  name="{attr} {ctype} grade"
                  bind:group={$arkGridCores[attr][ctype].grade}
                  onchange={() => resetCoeffWhenGradeChanges(attr, ctype, grade)}
                  value={grade}
                />
                {grade}
              </label>
            {/each}
          </div>

          <div class="row core-coeffs">
            <span class="title">계수</span>
            {#each coeffKeys as coeffKey}
              <label class="core-coeff">
                {coeffKey.slice(1)}
                <input type="number" bind:value={$arkGridCores[attr][ctype].coeffs[coeffKey]} />
              </label>
            {/each}
          </div>
        {:else}
          <div class="row">
            <button onclick={() => createNewCore(attr, ctype)}>+</button>
          </div>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  .core-slot {
    border: 1px solid black;
    padding: 0.5rem;
  }
  .core-slot > .core-name {
    font-weight: 700;
  }
  .core-slot > .row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
  }

  .core-slot > .row > .title {
    font-weight: 500;
    min-width: 5em;
  }
  .core-slot > .core-coeffs {
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .core-slot > .core-coeffs > .core-coeff{
    display: flex;
    flex-wrap: nowrap;
    gap: 0.2em;
  }
  .core-slot > .core-coeffs > .core-coeff > input {
    width: 3rem;
  }
</style>
