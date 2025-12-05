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
  import { Core, Gem, GemSet, GemSetPackTuple } from '../lib/solver/models';
  import { getBestGemSetPacks, getPossibleGemSets } from '../lib/solver/solver';
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

  function convertToSolverGems(gem: ArkGridGem[]): {
    gems: Gem[];
    reverseMap: ArkGridGem[];
  } {
    // Svelte에서 사용하는 ArkGridGem을 solver가 사용하는 형태로 변경
    const reverseMap: ArkGridGem[] = [];
    const gems = gem.map((g, index) => {
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
      reverseMap[index] = g;
      return new Gem(BigInt(index), g.req, g.point, att, skill, boss);
    });
    return {
      gems,
      reverseMap,
    };
  }

  function getMaxStat(gss: GemSet[], statType: 'att' | 'skill' | 'boss') {
    // 주어진 GemSet[]에서 가장 높은 statType의 값을 가져옵니다.
    let result = 0;
    for (const gs of gss) {
      if (gs[statType] > result) {
        result = gs[statType];
      }
    }
    return result;
  }

  function solve() {
    /* sovler.Core로 변경 */
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

    /* sovler.Gem으로 변경 */
    const { gems: orderGems, reverseMap: orderGemReverseMap } =
      convertToSolverGems(globalAppConfig.current.orderGems);
    const { gems: chaosGems, reverseMap: chaosGemReverseMap } =
      convertToSolverGems(globalAppConfig.current.chaosGems);
    console.log(`질서 젬 ${orderGems.length}개, 혼돈 젬 ${chaosGems.length}개`);

    /* 각 코어별 장착 가능한 조합 (GemSet) 수집 */
    const orderGssList = orderCores.map((c) => {
      return getPossibleGemSets(c, orderGems);
    });
    const chaosGssList = chaosCores.map((c) => {
      return getPossibleGemSets(c, chaosGems);
    });

    orderGssList.forEach((gss, i) => {
      console.log(`질서 코어 ${i + 1} 조합: ${gss.length}개`);
    });
    chaosGssList.forEach((gss, i) => {
      console.log(`혼돈 코어 ${i + 1} 조합: ${gss.length}개`);
    });
    const allGssList = orderGssList.concat(chaosGssList);
    /* 공격력, 추가 피해, 보스 피해 Lv의 최대 */
    // 가지고 있는 모든 젬을 사용했을 때 도달할 수 있는 최대 "공격력" 구하기
    // 각 코어가 가진 젬 조합 중 가장 높은 공격력을 가진 것을 고르고 합하는 것으로 가능 (중복 검사는 하지 않음)
    // 러프하지만 빠르게 가능

    // 이를 공격력 이외에도 추가 피해과 보스 피해에 대해서 수행
    let attMax = 0,
      skillMax = 0,
      bossMax = 0;
    for (const gss of allGssList) {
      attMax += getMaxStat(gss, 'att');
      skillMax += getMaxStat(gss, 'skill');
      bossMax += getMaxStat(gss, 'boss');
    }
    console.log('시스템 전체 공, 추, 보', attMax, skillMax, bossMax);

    // 앞서 구한 최대 수치를 활용하여 각 GemSet의 전투력 범위 설정
    for (const gss of allGssList) {
      for (const gs of gss) {
        gs.setScoreRange(attMax, skillMax, bossMax);
      }
    }

    // 질서와 혼돈 코어에 대해서 중복을 고려한, 장착 가능한 GemSet들이 3개 모인 GemSetPack 계산
    const orderGspList = getBestGemSetPacks(
      orderGssList,
      attMax,
      skillMax,
      bossMax
    );
    console.log('질서 배치 개수', orderGspList.length);
    const chaosGspList = getBestGemSetPacks(
      chaosGssList,
      attMax,
      skillMax,
      bossMax
    );
    console.log('혼돈 배치 개수', orderGspList.length);
    // gspList는 maxScore 기준으로 내림차순 정렬되어 있음
    // 서로의 영향력이 적을 수록 실제 전투력은 maxScore와 가까우니, 우선 각 첫 번째 원소를 대상으로 시작 설정
    let answer = new GemSetPackTuple(
      orderGspList[0] ?? null,
      chaosGspList[0] ?? null
    );
    for (const gsp1 of orderGspList) {
      for (const gsp2 of chaosGspList) {
        if (gsp1.maxScore * gsp2.maxScore < answer.score) break;
        const gspt = new GemSetPackTuple(gsp1, gsp2);
        if (gspt.score > answer.score) {
          answer = gspt;
        }
      }
    }
    console.log(answer);

    function assignGem(
      gs: GemSet | null | undefined,
      reverseMap: ArkGridGem[],
      coreIndex: number
    ): ArkGridGem[] {
      // GemSet에서 대응되는 ArkGridGem를 찾아서 assign
      if (!gs) return [];
      let b: bigint = gs.bitmask;
      let pos = 0;
      const result: ArkGridGem[] = [];

      while (b > 0n) {
        if ((b & 1n) == 1n) {
          reverseMap[pos].assign = coreIndex;
        }
        pos += 1;
        b >>= 1n;
      }
      return result;
    }

    globalAppConfig.current.orderGems.forEach((g) => {
      delete g.assign;
    });
    globalAppConfig.current.chaosGems.forEach((g) => {
      delete g.assign;
    });
    assignGem(answer.gsp1?.gs1, orderGemReverseMap, 0);
    assignGem(answer.gsp1?.gs2, orderGemReverseMap, 1);
    assignGem(answer.gsp1?.gs3, orderGemReverseMap, 2);
    assignGem(answer.gsp2?.gs1, chaosGemReverseMap, 3);
    assignGem(answer.gsp2?.gs2, chaosGemReverseMap, 4);
    assignGem(answer.gsp2?.gs3, chaosGemReverseMap, 5);
    return;
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
          <div>NO</div>
        {/if}
      {/each}
    {/each}
  </div>
  <button onclick={solve}> Solve!</button>
</div>
