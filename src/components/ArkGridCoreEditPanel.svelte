<script lang="ts">
  import { ArkGridAttr, ArkGridGrade } from '../lib/constants/enums';
  import {
    ArkGridCoreType,
    createCore,
    resetCoreCoeff,
  } from '../lib/models/arkGridCores';
  import { globalAppConfig, initArkGridCores } from '../lib/store';

  const arkGridCoreTierName: Record<ArkGridCoreType, Array<string>> = {
    [ArkGridCoreType.SUN]: ['현란한 공격', '안정적인/재빠른 공격', '그 외'],
    [ArkGridCoreType.MOON]: ['불타는 일격', '흡수의/부수는 일격', '그 외'],
    [ArkGridCoreType.STAR]: ['공격', '무기', '그 외'],
  } as const;
  const attrs = Object.values(ArkGridAttr);
  const ctypes = Object.values(ArkGridCoreType);
  const grades = Object.values(ArkGridGrade);
  const coeffKeys = ['p10', 'p14', 'p17', 'p18', 'p19', 'p20'] as const;
  const coreImages = import.meta.glob<string>('../assets/cores/*.png', {
    eager: true, // 바로 import (비동기 아님)
    import: 'default', // 각 파일의 기본 export 경로 사용
  });
  // enum 값 → 파일 이름 매핑
  const attrMap = {
    [ArkGridAttr.Order]: 'order',
    [ArkGridAttr.Chaos]: 'chaos',
  };
  const typeMap = {
    [ArkGridCoreType.SUN]: 'sun',
    [ArkGridCoreType.MOON]: 'moon',
    [ArkGridCoreType.STAR]: 'star',
  };
  // 조합 → 이미지 경로 함수
  const getCoreImage = (attr: ArkGridAttr, ctype: ArkGridCoreType) => {
    const key = `../assets/cores/${attrMap[attr]}_${typeMap[ctype]}.png`;
    return coreImages[key];
  };

  let arkGridCores = $derived(globalAppConfig.current.cores);
  function createNewCore(attr: ArkGridAttr, ctype: ArkGridCoreType) {
    // 코어가 없을 때 새로운 코어 추가
    // 기본 영웅 등급
    globalAppConfig.current.cores[attr][ctype] = createCore(
      attr,
      ctype,
      ArkGridGrade.EPIC
    );
  }
  function resetCoeffWhenCoreChanges(
    attr: ArkGridAttr,
    ctype: ArkGridCoreType
  ) {
    const core = globalAppConfig.current.cores[attr][ctype];
    if (core) {
      resetCoreCoeff(core);
    }
  }
</script>

<div class="panel">
  <div class="buttons">
    <button
      onclick={() => {
        globalAppConfig.current.uiConfig.showCoreCoeff =
          !globalAppConfig.current.uiConfig.showCoreCoeff;
      }}
    >
      전투력 계수 {globalAppConfig.current.uiConfig.showCoreCoeff
        ? '숨김'
        : '수정'}
    </button>
    <button
      onclick={() => {
        globalAppConfig.current.cores = initArkGridCores();
      }}>모든 코어 초기화</button
    >
  </div>
  {#each attrs as attr}
    {#each ctypes as ctype}
      <div class="core-slot">
        <div class="row core-name">
          <img
            src={getCoreImage(attr, ctype)}
            alt="{attr} {ctype}"
            data-grade={arkGridCores[attr][ctype]?.grade}
          />
          {attr}의 {ctype}
        </div>

        {#if arkGridCores[attr][ctype]}
          <div class="row core-grade">
            <span class="title">등급</span>
            {#each grades as grade}
              <label>
                <input
                  type="radio"
                  name="{attr} {ctype} grade"
                  bind:group={arkGridCores[attr][ctype].grade}
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
                    bind:group={arkGridCores[attr][ctype].tier}
                    onchange={() => resetCoeffWhenCoreChanges(attr, ctype)}
                    value={tier}
                  />
                  {arkGridCoreTierName[ctype][tier]}
                </label>
              {/each}
            </div>
          {/if}

          {#if globalAppConfig.current.uiConfig.showCoreCoeff}
            <!-- 계수 숨기면 보이지 않음 -->
            <div class="row core-coeffs">
              <span class="title">계수</span>
              <div class="coeff-inputs">
                {#each coeffKeys as coeffKey}
                  <label class="coeff-input">
                    {coeffKey.slice(1)}P
                    <input
                      type="number"
                      name="{attr} {ctype} {coeffKey}"
                      bind:value={arkGridCores[attr][ctype].coeffs[coeffKey]}
                    />
                  </label>
                {/each}
              </div>
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
  .panel {
    position: relative; /* overlay 위치 기준 */
  }

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
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    padding: 0.75rem;
    min-height: 3rem;

    /* 내부 요소 */
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .core-slot > .core-name {
    font-weight: 700;
    margin-left: 0.2rem;
    margin-top: 0.2rem;
    margin-bottom: 1rem;
  }
  .core-slot > .core-name > img {
    height: 2.5rem;
    border-radius: 0.5rem;
    padding: 0.1rem;
  }
  .core-slot > .row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.8rem;
  }

  .core-slot > .row > .title {
    font-weight: 500;
    min-width: 5em;
  }
  .core-slot > .core-coeffs {
    flex-wrap: nowrap;
  }
  .core-slot > .core-coeffs > .coeff-inputs {
    /* coeff-input을 담고 있는 객체, wrap되어도 된다. */
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
  }
  .core-slot > .core-coeffs > .coeff-inputs > .coeff-input {
    /* label + input으로 이루어진 쌍 */
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 0.2em;
    align-items: center;
  }
  .core-slot > .core-coeffs > .coeff-inputs > .coeff-input > input {
    width: 2.4rem;
    border: 1px solid var(--border);
    height: 1.3rem;
  }

  /* 공홈 코어 css*/
  .core-slot > .core-name > img[data-grade='영웅'] {
    background: linear-gradient(135deg, #261331, #480d5d);
  }

  .core-slot > .core-name > img[data-grade='전설'] {
    background: linear-gradient(135deg, #362003, #9e5f04);
  }

  .core-slot > .core-name > img[data-grade='유물'] {
    background: linear-gradient(135deg, #341a09, #a24006);
  }

  .core-slot > .core-name > img[data-grade='고대'] {
    background: linear-gradient(135deg, #3d3325, #dcc999);
  }
</style>
