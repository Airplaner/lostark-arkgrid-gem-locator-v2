<script lang="ts">
  import { type ArkGridAttr, ArkGridAttrs } from '../lib/constants/enums';
  import {
    type ArkGridCore,
    type ArkGridCoreType,
    ArkGridCoreTypes,
  } from '../lib/models/arkGridCores';
  import {
    type ArkGridGem,
    ArkGridGemOptionTypes,
  } from '../lib/models/arkGridGems';
  import {
    Core,
    Gem,
    GemSet,
    GemSetPack,
    GemSetPackTuple,
    buildScoreMap,
  } from '../lib/solver/models';
  import { getBestGemSetPacks, getPossibleGemSets } from '../lib/solver/solver';
  import {
    type CharacterProfile,
    getCurrentProfile,
    unassignGems,
  } from '../lib/state/profile.state.svelte';
  import SolveCoreEdit from './SolveCoreEdit.svelte';
  import SolveResult from './solveResult/SolveResult.svelte';

  type Props = {
    profile: CharacterProfile;
  };
  let { profile }: Props = $props();

  const coreComponents: Record<
    ArkGridAttr,
    Record<ArkGridCoreType, SolveCoreEdit | null>
  > = $state(
    Object.fromEntries(
      Object.values(ArkGridAttrs).map((attr) => [
        attr,
        Object.fromEntries(
          Object.values(ArkGridCoreTypes).map((type) => [type, null])
        ),
      ])
    )
  ) as Record<ArkGridAttr, Record<ArkGridCoreType, SolveCoreEdit | null>>;

  export type SolveAnswerScoreSet = {
    score: number;
    bestScore: number;
    perfectScore: number;
  };
  export type SolveAnswer = {
    assignedGems: ArkGridGem[][];
    gemSetPackTuple: GemSetPackTuple;
  };
  let scoreSet = $state<SolveAnswerScoreSet | null>(null);
  let solveAnswer = $state<SolveAnswer | null>(null);
  let answerCores = $state<Record<
    ArkGridAttr,
    Record<ArkGridCoreType, ArkGridCore | null>
  > | null>(null);

  let failedSign = $derived.by(() => {
    // 배치 실패 여부 반환

    // 코어가 애초에 없으면 실패를 안 함
    const allOrderCoresNull =
      !answerCores ||
      Object.values(answerCores[ArkGridAttrs.Order]).every((v) => v == null);
    const allChaosCoresNull =
      !answerCores ||
      Object.values(answerCores[ArkGridAttrs.Chaos]).every((v) => v == null);

    return {
      order: solveAnswer?.gemSetPackTuple.gsp1 === null && !allOrderCoresNull,
      chaos: solveAnswer?.gemSetPackTuple.gsp2 === null && !allChaosCoresNull,
    };
  });

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
        const gem = reverseMap[pos];
        result.push(gem);
        gem.assign = coreIndex;
      }
      pos += 1;
      b >>= 1n;
    }
    return result;
  }

  function solve() {
    console.log('-------풀이 시작-------');
    /* sovler.Core로 변경 */
    const orderCores: Core[] = [];
    const chaosCores: Core[] = [];
    for (const attr of Object.values(ArkGridAttrs)) {
      for (const ctype of Object.values(ArkGridCoreTypes)) {
        const core = coreComponents[attr][ctype];
        if (!core) continue;
        const targetCores =
          attr === ArkGridAttrs.Order ? orderCores : chaosCores;
        const solverCore = core.convertToSolverCore();
        if (solverCore) {
          targetCores.push(solverCore);
        }
      }
    }
    console.log('질서 코어', orderCores);
    console.log('혼돈 코어', chaosCores);

    /* sovler.Gem으로 변경 */
    const { gems: orderGems, reverseMap: orderGemReverseMap } =
      convertToSolverGems(getCurrentProfile().gems.orderGems);
    const { gems: chaosGems, reverseMap: chaosGemReverseMap } =
      convertToSolverGems(getCurrentProfile().gems.chaosGems);
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
    const scoreMaps = [
      buildScoreMap(400, attMax),
      buildScoreMap(700, skillMax),
      buildScoreMap(1000, bossMax),
    ];

    // 각 GemSet의 전투력 범위 설정
    for (const gss of allGssList) {
      for (const gs of gss) {
        gs.setScoreRange(scoreMaps);
      }
    }

    // 질서와 혼돈 코어에 대해서 중복을 고려한, 장착 가능한 GemSet들이 3개 모인 GemSetPack 계산
    let start = performance.now();
    const orderGspList = getBestGemSetPacks(orderGssList, scoreMaps);
    console.log('질서 배치 개수', orderGspList.length);
    console.log(`질서 배치 실행 시간: ${performance.now() - start} ms`);
    start = performance.now();
    const chaosGspList = getBestGemSetPacks(chaosGssList, scoreMaps);
    console.log('혼돈 배치 개수', chaosGspList.length);
    console.log(`혼돈 배치 실행 시간: ${performance.now() - start} ms`);

    // gspList는 maxScore 기준으로 내림차순 정렬되어 있음
    // 서로의 영향력이 적을 수록 실제 전투력은 maxScore와 가까우니, 우선 각 첫 번째 원소를 대상으로 시작 설정
    let answer = new GemSetPackTuple(
      orderGspList[0] ?? null,
      chaosGspList[0] ?? null
    );

    start = performance.now();
    // GemSetPack은 정말 많지만, 실제로 그들의 값 (공, 추, 보, 코어)만 보면 몇 종류 되지 않음
    // 같은 종류라면 하나의 GemSetPack만 수집하기
    const gemSetPackSet: GemSetPack[][] = [[], []];

    for (const [i, gspList] of [orderGspList, chaosGspList].entries()) {
      const seen = new Set<string>();
      for (const gsp of gspList) {
        const signature = {
          att: gsp.att,
          skill: gsp.skill,
          boss: gsp.boss,
          coreScore: gsp.coreScore,
        };
        const key = JSON.stringify(signature);
        if (!seen.has(key)) {
          seen.add(key);
          gemSetPackSet[i].push(gsp);
        }
      }
    }
    console.log(`중복 제거 실행 시간: ${performance.now() - start} ms`);
    if (gemSetPackSet[0].length > 0 && gemSetPackSet[1].length > 0) {
      for (const gsp1 of gemSetPackSet[0]) {
        for (const gsp2 of gemSetPackSet[1]) {
          const gspt = new GemSetPackTuple(gsp1, gsp2);
          if (gspt.score > answer.score) {
            answer = gspt;
          }
        }
      }
    }
    if (answer.gsp1 === null) {
      console.log('🚗 질서 배치 실패!');
    }
    if (answer.gsp2 === null) {
      console.log('🚗 혼돈 배치 실패!');
    }
    console.log(answer);
    unassignGems();
    solveAnswer = {
      assignedGems: JSON.parse(
        JSON.stringify([
          assignGem(answer.gsp1?.gs1, orderGemReverseMap, 0),
          assignGem(answer.gsp1?.gs2, orderGemReverseMap, 1),
          assignGem(answer.gsp1?.gs3, orderGemReverseMap, 2),
          assignGem(answer.gsp2?.gs1, chaosGemReverseMap, 3),
          assignGem(answer.gsp2?.gs2, chaosGemReverseMap, 4),
          assignGem(answer.gsp2?.gs3, chaosGemReverseMap, 5),
        ])
      ), // deep copy gems
      gemSetPackTuple: answer,
    };
    return answer;
  }
  function bestSolve() {
    const perfectGems = [
      {
        req: 3,
        point: 5,
        option1: { optionType: ArkGridGemOptionTypes.ATTACK, value: 5 },
        option2: {
          optionType: ArkGridGemOptionTypes.SKILL_DAMAGE,
          value: 5,
        },
      },
      {
        req: 4,
        point: 5,
        option1: { optionType: ArkGridGemOptionTypes.ATTACK, value: 5 },
        option2: {
          optionType: ArkGridGemOptionTypes.BOSS_DAMAGE,
          value: 5,
        },
      },
      {
        req: 5,
        point: 5,
        option1: {
          optionType: ArkGridGemOptionTypes.SKILL_DAMAGE,
          value: 5,
        },
        option2: {
          optionType: ArkGridGemOptionTypes.BOSS_DAMAGE,
          value: 5,
        },
      },
    ];
    const orderCores: Core[] = [];
    const chaosCores: Core[] = [];
    for (const attr of Object.values(ArkGridAttrs)) {
      for (const ctype of Object.values(ArkGridCoreTypes)) {
        const core = coreComponents[attr][ctype];
        if (!core) continue;
        const targetCores =
          attr === ArkGridAttrs.Order ? orderCores : chaosCores;
        const solverCore = core.convertToSolverCore();
        if (solverCore) {
          targetCores.push(solverCore);
        }
      }
    }
    const perfectOrderGems: ArkGridGem[] = [];
    const perfectChaosGems: ArkGridGem[] = [];
    for (const gem of perfectGems) {
      for (let i = 0; i < 4; i++) {
        perfectOrderGems.push({ gemAttr: ArkGridAttrs.Order, ...gem });
        perfectChaosGems.push({ gemAttr: ArkGridAttrs.Chaos, ...gem });
      }
    }
    const { gems: orderGems, reverseMap: orderGemReverseMap } =
      convertToSolverGems(perfectOrderGems);
    const { gems: chaosGems, reverseMap: chaosGemReverseMap } =
      convertToSolverGems(perfectChaosGems);
    const orderGssList = orderCores.map((c) => {
      return getPossibleGemSets(c, orderGems);
    });
    const chaosGssList = chaosCores.map((c) => {
      return getPossibleGemSets(c, chaosGems);
    });
    for (const gssList of [orderGssList, chaosGssList]) {
      for (let i = 0; i < gssList.length; i++) {
        const gss = gssList[i];
        const seen = new Set<string>();
        const uniqueGss: GemSet[] = [];
        for (const gs of gss) {
          const key = JSON.stringify({
            att: gs.att,
            skill: gs.skill,
            boss: gs.boss,
            coreScore: gs.coreCoeff,
          });
          if (!seen.has(key)) {
            seen.add(key);
            uniqueGss.push(gs);
          }
        }
        gssList[i] = uniqueGss;
      }
    }
    const allGssList = orderGssList.concat(chaosGssList);
    let attMax = 0,
      skillMax = 0,
      bossMax = 0;
    for (const gss of allGssList) {
      attMax += getMaxStat(gss, 'att');
      skillMax += getMaxStat(gss, 'skill');
      bossMax += getMaxStat(gss, 'boss');
    }
    const scoreMaps = [
      buildScoreMap(400, attMax),
      buildScoreMap(700, skillMax),
      buildScoreMap(1000, bossMax),
    ];
    // 각 GemSet의 전투력 범위 설정
    for (const gss of allGssList) {
      for (const gs of gss) {
        gs.setScoreRange(scoreMaps);
      }
    }
    const orderGspList = getBestGemSetPacks(orderGssList, scoreMaps, true);
    const chaosGspList = getBestGemSetPacks(chaosGssList, scoreMaps, true);
    let answer = new GemSetPackTuple(
      orderGspList[0] ?? null,
      chaosGspList[0] ?? null
    );
    const gemSetPackSet: GemSetPack[][] = [[], []];
    for (const [i, gspList] of [orderGspList, chaosGspList].entries()) {
      const seen = new Set<string>();
      for (const gsp of gspList) {
        const signature = {
          att: gsp.att,
          skill: gsp.skill,
          boss: gsp.boss,
          coreScore: gsp.coreScore,
        };
        const key = JSON.stringify(signature);
        if (!seen.has(key)) {
          seen.add(key);
          gemSetPackSet[i].push(gsp);
        }
      }
    }
    if (gemSetPackSet[0].length > 0 && gemSetPackSet[1].length > 0) {
      for (const gsp1 of gemSetPackSet[0]) {
        for (const gsp2 of gemSetPackSet[1]) {
          const gspt = new GemSetPackTuple(gsp1, gsp2);
          if (gspt.score > answer.score) {
            answer = gspt;
          }
        }
      }
    }
    return answer;
  }
  function runSolve() {
    const score = (solve().score - 1) * 100; // 내 최고 점수
    const bestScore = (bestSolve().score - 1) * 100; // 내 코어로 가능한 점수
    const perfectScore = // 이론상 최고 점수
      ((((((1.09 * // 고대 질서 해
        1.09 * // 고대 질서 달
        1.06 * // 고대 질서 별
        1.04 * // 고대 혼돈 해
        1.04 * // 고대 혼돈 별
        1.04 * // 고대 혼돈 달
        (Math.floor((60 * 400) / 120) + 10000)) /
        10000) * // 공격력 Lv. 60
        (Math.floor((90 * 700) / 120) + 10000)) /
        10000) * // 추가 피해 Lv. 90
        (Math.floor((90 * 1000) / 120) + 10000)) /
        10000 - // 보스 피해 Lv. 90
        1) *
      100;
    scoreSet = {
      score,
      bestScore,
      perfectScore,
    };
    answerCores = JSON.parse(JSON.stringify(profile.cores));
  }
</script>

<div class="panel">
  <div class="title">최적화 설정</div>
  <div class="container">
    <div class="core-solve-goal-edit">
      <div class="title">코어 목표 포인트 설정</div>
      <div class="container">
        {#each Object.values(ArkGridAttrs) as attr}
          {#each Object.values(ArkGridCoreTypes) as ctype}
            <SolveCoreEdit
              {attr}
              {ctype}
              core={profile.cores[attr][ctype]}
              bind:this={coreComponents[attr][ctype]}
            ></SolveCoreEdit>
          {/each}
        {/each}
      </div>
    </div>
    {#if failedSign.order || failedSign.chaos}
      <div class="failed-sign">
        {#if failedSign.order}
          <div class="big">⚠️ 질서 배치 실패 ⚠️</div>
        {/if}
        {#if failedSign.chaos}
          <div class="big">⚠️ 혼돈 배치 실패 ⚠️</div>
        {/if}
        <div class="small">목표 포인트를 조절해보세요.</div>
      </div>
    {/if}
    <button class="solve-button" onclick={runSolve}>실행</button>

    {#if solveAnswer && scoreSet && answerCores}
      <SolveResult {answerCores} {scoreSet} {solveAnswer}></SolveResult>
    {/if}
  </div>
</div>

<style>
  .panel {
    min-height: 60rem;
  }
  .solve-button {
    font-size: 1.5rem;
    width: 10rem;
    height: 4rem;
    align-self: center;
  }

  .panel > .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .core-solve-goal-edit {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem;
  }
  .core-solve-goal-edit > .title {
    font-size: 1.4rem;
    font-weight: 500;
    /* text-align: center; */
  }
  .core-solve-goal-edit > .container {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .failed-sign {
    background: var(--card);
    border-radius: 0.4rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  .failed-sign > .big {
    font-weight: 500;
    font-size: 1.2rem;
  }
  .failed-sign > .small {
    font-size: 1rem;
  }
</style>
