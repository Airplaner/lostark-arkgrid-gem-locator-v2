import { Core } from './models';
import { Gem } from './models';
import { GemSet, GemSetPack } from './models';

export function getPossibleGemSets(core: Core, gems: Gem[]): GemSet[] {
  // 주어진 gems을 사용해서 요구하는 energy와 point를 모두 충족하는 집합을 반환합니다.
  const n = gems.length;
  const g = [...gems].sort((a, b) => a.req - b.req);
  const energy = core.energy;
  const point = core.point;
  const result: GemSet[] = [];

  for (let i = 0; i < n; i++) {
    const ei = energy - g[i].req;
    const pi = g[i].point;
    if (ei < 3) break;
    if (pi + 15 < point) continue;

    for (let j = i + 1; j < n; j++) {
      const ej = ei - g[j].req;
      const pj = pi + g[j].point;
      if (pj >= point && ej >= 0)
        result.push(new GemSet((gems = [g[i], g[j]]), core));
      if (ej < 3) continue;
      if (ej < 0) break;
      if (pj + 10 < point) continue;

      for (let k = j + 1; k < n; k++) {
        const ek = ej - g[k].req;
        const pk = pj + g[k].point;
        if (pk >= point && ek >= 0)
          result.push(new GemSet((gems = [g[i], g[j], g[k]]), core));
        if (ek < 3) continue;
        if (ek < 0) break;
        if (pk + 5 < point) continue;
        for (let m = k + 1; m < n; m++) {
          const el = ek - g[m].req;
          const pl = pk + g[m].point;
          if (el < 0) break;
          if (pl >= point && el >= 0)
            result.push(new GemSet((gems = [g[i], g[j], g[k], g[m]]), core));
        }
      }
    }
  }
  return result;
}
export function getGemSets(gems: Gem[], core: Core) {
  // 주어진 gems를 core에 장착할 수 있는 모든 경우의 수를 GemSet으로 반환합니다.

  // ensure unique indices
  const idxs = new Set(gems.map((g) => g.index));
  if (idxs.size !== gems.length) throw new Error('index 중복');

  return getPossibleGemSets(core, gems);
}

export function getBestGemSetPacks(
  gss1: GemSet[],
  gss2: GemSet[] | undefined,
  gss3: GemSet[] | undefined,
  attMax: number,
  skillMax: number,
  bossMax: number,
  maxCandidates: number
) {
  const cache: any = 0;

  function getCandidates(currentBitmask: bigint, gss: GemSet[]): GemSet[] {
    // 주어진 Core가 가진 GemSet 중 currentBitmask와 충돌하지 않는 GemSet의 목록을 반환
    let res = [];
    for (const gs of gss) {
      if ((gs.bitmask & currentBitmask) === 0n) {
        res.push(gs);
        if (res.length > maxCandidates) break;
      }
    }
    return res;
  }

  let answer = [];
  let targetMin = 0; // 현재까지 찾은 배치 중 전투력 범위의 하한(min)의 가장 큰 값

  if (gss1) gss1.sort((a, b) => b.maxScore - a.maxScore);
  if (gss2) gss2.sort((a, b) => b.maxScore - a.maxScore);
  if (gss3) gss3.sort((a, b) => b.maxScore - a.maxScore);

  /* 코어 1개 */
  if (!gss2 && !gss3) {
    return gss1.slice(0, maxCandidates);
  }

  /* 코어 2개 */
  if (gss2 && !gss3) {
    const gm2 = gss2[0].maxScore;
    for (const gs1 of gss1) {
      if (gs1.maxScore * gm2 < targetMin) break;

      for (const gs2 of gss2) {
        const gsp = new GemSetPack(
          gs1,
          gs2,
          undefined,
          attMax,
          skillMax,
          bossMax
        );
        if (gsp.maxScore > targetMin) {
          answer.push(gsp);
        }

        if (gsp.minScore > targetMin) {
          targetMin = gsp.minScore;
        }
      }
    }
  }

  if (gss2 && gss3) {
    const gm2 = gss2[0].maxScore;
    const gm3 = gss3[0].maxScore;

    for (const gs1 of gss1) {
      if (gs1.maxScore * gm2 * gm3 < targetMin) break;
      for (const gs2 of getCandidates(gs1.bitmask, gss2)) {
        if (gs1.maxScore * gs2.maxScore * gm3 < targetMin) break;
        for (const gs3 of getCandidates(gs1.bitmask | gs2.bitmask, gss3)) {
          if (gs1.maxScore * gs2.maxScore * gs3.maxScore < targetMin) break;
          // 세 개의 GemSet으로 얻을 수 있는 전투력 범위 구함
          let gsp = new GemSetPack(gs1, gs2, gs3, attMax, skillMax, bossMax);
          // 정답일 가능성이 있다면 후보에 추가
          if (gsp.maxScore > targetMin) {
            answer.push(gsp);
          }
          // 새로운 젬 배치 (GemSetPack)가 보장하는 최소 전투력이 기존보다 높은 경우 갱신
          // 더 이상 후보가 아닌 요소를 answer에서 빼는 것은 마지막에 수행
          if (gsp.minScore > targetMin) {
            targetMin = gsp.minScore;
          }
        }
      }
    }
  }
  // maxScore이 targetMin보다 작은 경우엔 아예 후보조차 아님
  answer = answer.filter((g) => g.maxScore >= targetMin);
  answer.sort((a, b) => b.maxScore - a.maxScore);
  return answer;
}
