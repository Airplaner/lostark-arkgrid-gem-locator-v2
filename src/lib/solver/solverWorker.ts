import { type Core, type Gem } from './models';
import { getPossibleGemSets } from './solver';
import type { LevelSum, SolverWorkerRequest, SolverWorkerResponse } from './types';

function solveWorkA(cores: Core[], gems: Gem[], levelSum: LevelSum) {
  const gssList = cores.map((c) => {
    return getPossibleGemSets(c, gems);
  });
  // ...
  return [];
}

self.onmessage = async (e: MessageEvent<SolverWorkerRequest>) => {
  const data = e.data;
  switch (data.type) {
    case 'getBestGemSetPacks': {
      const result = solveWorkA(data.cores, data.gems, data.levelSum);
      self.postMessage({
        type: 'getBestGemSetPacks:done',
        gemSetPacks: result,
      } satisfies SolverWorkerResponse);
      break;
    }
  }
};
