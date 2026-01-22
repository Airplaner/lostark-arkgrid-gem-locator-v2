<script lang="ts">
  import {
    type ArkGridAttr,
    ArkGridAttrs,
    LostArkGrades,
  } from '../lib/constants/enums';
  import {
    type ArkGridCoreType,
    ArkGridCoreTypes,
    getCoreImage,
    getMaxCorePoint,
    resetCoreCoeff,
  } from '../lib/models/arkGridCores';
  import { appConfig } from '../lib/state/appConfig.state.svelte';
  import {
    type WeaponInfo,
    addCore,
    getCore,
    resetCore,
  } from '../lib/state/profile.state.svelte';

  type Props = {
    attr: ArkGridAttr;
    ctype: ArkGridCoreType;
    isSupporter: boolean;
    weapon: WeaponInfo | undefined;
  };
  let { attr, ctype, isSupporter, weapon }: Props = $props();
  // 조합 → 이미지 경로 함수

  const coeffKeys = ['p10', 'p14', 'p17', 'p18', 'p19', 'p20'] as const;
  let core = $derived(getCore(attr, ctype));
  let arkGridCoreTierName: Record<ArkGridCoreType, Array<string>> = $derived.by(
    () => {
      return !isSupporter
        ? {
            [ArkGridCoreTypes.SUN]: [
              '현란한 공격',
              '안정적인/재빠른 공격',
              '그 외',
            ],
            [ArkGridCoreTypes.MOON]: [
              '불타는 일격',
              '흡수의/부수는 일격',
              '그 외',
            ],
            [ArkGridCoreTypes.STAR]: ['공격', '무기', '그 외'],
          }
        : {
            [ArkGridCoreTypes.SUN]: [
              '신념의 강화',
              '흐르는 마나/불굴의 강화',
              '그 외',
            ],
            [ArkGridCoreTypes.MOON]: [
              '낙인의 흔적',
              '강철의/치명적인 흔적',
              '그 외',
            ],
            [ArkGridCoreTypes.STAR]: ['무기', '생명', '그 외'],
          };
    }
  );
  let maxCorePoint = $derived(getMaxCorePoint(core));
</script>

<fieldset class="core-slot">
  <legend class="core-title">
    <div class="core-img-name-tuple">
      <img
        src={getCoreImage(attr, ctype)}
        alt="{attr} {ctype}"
        data-grade={core?.grade}
      />
      {attr}의 {ctype}
    </div>
    {#if core}
      <button
        class="close"
        aria-label="닫기"
        onclick={() => resetCore(attr, ctype)}>x</button
      >
    {/if}
  </legend>
  {#if core}
    <div class="row core-grade">
      <span class="title">등급</span>
      <div class="input-title-tuples">
        {#each Object.values(LostArkGrades) as grade}
          <label class="input-title-tuple">
            <input
              type="radio"
              name="{attr} {ctype} grade"
              bind:group={core.grade}
              onchange={() => {
                resetCoreCoeff(core, isSupporter, weapon);
              }}
              value={grade}
            />
            {grade}
          </label>
        {/each}
      </div>
    </div>

    {#if attr == ArkGridAttrs.Chaos}
      <div class="row core-tier">
        <span class="title">종류</span>
        <div class="input-title-tuples">
          {#each arkGridCoreTierName[ctype] as tierName, tier}
            <label class="input-title-tuple">
              <input
                type="radio"
                name="{attr} {ctype} tier"
                bind:group={core.tier}
                onchange={() => {
                  resetCoreCoeff(core, isSupporter, weapon);
                }}
                value={tier}
                disabled={isSupporter &&
                  attr == ArkGridAttrs.Chaos &&
                  ctype == ArkGridCoreTypes.STAR &&
                  tier == 1}
              />
              {tierName}
            </label>
          {/each}
        </div>
      </div>
    {/if}

    {#if appConfig.current.uiConfig.showCoreCoeff}
      <!-- 계수 숨기면 보이지 않음 -->
      <div class="row core-coeffs">
        <span class="title">계수</span>
        <div class="input-title-tuples">
          {#each coeffKeys as coeffKey}
            {#if Number(coeffKey.slice(1)) <= maxCorePoint}
              <label class="input-title-tuple">
                {coeffKey.slice(1)}P
                <input
                  type="number"
                  name="{attr} {ctype} {coeffKey}"
                  bind:value={core.coeffs[coeffKey]}
                />
              </label>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="row">
      <button
        class="add-button"
        onclick={() => addCore(attr, ctype, isSupporter)}
      >
        +
      </button>
    </div>
  {/if}
</fieldset>

<style>
  /* 개별 코어 슬롯 */
  .core-slot {
    border-radius: 0.4rem;
    border: 1px solid var(--border);
    padding: 0.75rem;
    min-height: 3rem;

    /* 내부 요소 */
    display: flex;
    flex-shrink: 0; /* 깨지지 않게 */
    flex-direction: column;
    gap: 0.4rem;
  }
  .core-slot > .core-title {
    font-weight: 700;

    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0rem 0.5rem 0rem 0.5rem;
  }
  .core-slot > .core-title > .core-img-name-tuple {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: none;
  }
  .core-slot > .core-title > .core-img-name-tuple > img {
    height: 2.5rem;
    border-radius: 0.5rem;
    padding: 0.1rem;
  }
  .core-slot > .core-title > button.close {
    display: flex;
    align-items: center; /* 세로 중앙정렬 */
    height: 1.5rem;
  }
  .core-slot > .row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.8rem;
  }

  .core-slot .input-title-tuples {
    /* input-title-tuple을 담고 있는 객체, wrap되어도 된다. */
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
  }

  .core-slot .input-title-tuples > .input-title-tuple {
    /* label + input으로 이루어진 tuple, nowrap */
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.2em;
    /* white-space: nowrap; */
  }

  .core-slot > .row > .title {
    font-weight: 500;
    min-width: clamp(2rem, 10%, 3rem);
  }
  .core-slot > .core-coeffs input {
    /* 테두리까지 포함해서 크기 계산 */
    box-sizing: border-box;
    font-size: 0.9rem;
    width: 3rem;
  }
  .core-slot > .row > button.add-button {
    display: flex;
    align-items: center; /* 세로 중앙정렬 */

    height: 1.5rem;
  }

  /* 공홈 코어 css*/
  .core-slot > .core-title > .core-img-name-tuple > img[data-grade='영웅'] {
    background: linear-gradient(135deg, #261331, #480d5d);
  }

  .core-slot > .core-title > .core-img-name-tuple > img[data-grade='전설'] {
    background: linear-gradient(135deg, #362003, #9e5f04);
  }

  .core-slot > .core-title > .core-img-name-tuple > img[data-grade='유물'] {
    background: linear-gradient(135deg, #341a09, #a24006);
  }

  .core-slot > .core-title > .core-img-name-tuple > img[data-grade='고대'] {
    background: linear-gradient(135deg, #3d3325, #dcc999);
  }
</style>
