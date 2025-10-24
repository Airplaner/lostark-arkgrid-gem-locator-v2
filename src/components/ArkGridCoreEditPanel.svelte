<script lang="ts">
  import { ArkGridAttr, ArkGridGrade } from '../lib/constants/enums';
  import { ArkGridCoreType, createCore, resetCoreCoeff } from '../lib/models/arkGridCores';
  import { arkGridCores, initArkGridCores } from '../stores/store';

  const arkGridCoreTierName: Record<ArkGridCoreType, Array<string>> = {
    [ArkGridCoreType.SUN]: ['현란한 공격', '안정적인/재빠른 공격', '그 외'],
    [ArkGridCoreType.MOON]: ['불타는 일격', '흡수의/부수는 일격', '그 외'],
    [ArkGridCoreType.STAR]: ['공격', '무기', '그 외'],
  } as const;
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
  function resetCoeffWhenCoreChanges(attr: ArkGridAttr, ctype: ArkGridCoreType) {
    arkGridCores.update((cores) => {
      const core = cores[attr][ctype];
      if (!core) return cores;
      resetCoreCoeff(core);
      return cores;
    });
  }

  let expertMode = $state(true);
</script>

<div class="panel">
  <div class="buttons">
    <button
      onclick={() => {
        expertMode = !expertMode;
      }}
    >
      전투력 계수 {expertMode ? '숨기기' : '보이기'}
    </button>
    <button onclick={resetAllCores}>전체 초기화</button>
  </div>
  {#each attrs as attr}
    {#each ctypes as ctype}
      <div class="core-slot">
        <div class="row core-name">
          {attr}의 {ctype} 코어
        </div>

        {#if $arkGridCores[attr][ctype]}
          <div class="row core-grade">
            <span class="title">등급</span>
            {#each grades as grade}
              <label>
                <input
                  type="radio"
                  name="{attr} {ctype} grade"
                  bind:group={$arkGridCores[attr][ctype].grade}
                  onchange={() => resetCoeffWhenCoreChanges(attr, ctype)}
                  value={grade}
                />
                {grade}
              </label>
            {/each}
          </div>

          {#if attr == ArkGridAttr.Chaos}
            <div class="row core-tier">
              <span class="title">종류</span>
              {#each [0, 1, 2] as tier}
                <label>
                  <input
                    type="radio"
                    name="{attr} {ctype} tier"
                    bind:group={$arkGridCores[attr][ctype].tier}
                    onchange={() => resetCoeffWhenCoreChanges(attr, ctype)}
                    value={tier}
                  />
                  {arkGridCoreTierName[ctype][tier]}
                </label>
              {/each}
            </div>
          {/if}

          {#if expertMode}
            <!-- 계수 숨기면 보이지 않음 -->
            <div class="row core-coeffs">
              <span class="title">계수</span>
              {#each coeffKeys as coeffKey}
                <label class="core-coeff">
                  {coeffKey.slice(1)}
                  <input
                    type="number"
                    name="{attr} {ctype} {coeffKey}"
                    bind:value={$arkGridCores[attr][ctype].coeffs[coeffKey]}
                  />
                </label>
              {/each}
            </div>
          {/if}
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
  /* 버튼 모음 */
  .buttons {
    display: flex;
    gap: 0.4rem;
    justify-content: right;
  }
  .buttons > button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;
  }

  /* 개별 코어 슬롯 */
  .core-slot {
    border: 1px solid black;
    padding: 0.5rem;
    min-height: 3rem;

    /* 내부 요소 */
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
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
  .core-slot > .core-coeffs > .core-coeff {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.2em;
  }
  .core-slot > .core-coeffs > .core-coeff > input {
    width: 3rem;
  }
</style>
