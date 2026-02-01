import type { Core, Gem, GemSetPack, GemSetPackTuple } from './models';

export type LevelSum = {
  att: number;
  skill: number;
  boss: number;
};

// main → worker
export type SolverWorkerRequest =
  | {
      type: 'getBestGemSetPacks';
      cores: Core[];
      gems: Gem[];
      levelSum: LevelSum;
    }
  | {
      type: 'getGemSetPackTuple'; // 안 쓸 거 같음
      orderGspList: GemSetPack[];
      chaosGspList: GemSetPack[];
    };

// worker → main
export type SolverWorkerResponse =
  | {
      type: 'getBestGemSetPacks:done';
      gemSetPacks: GemSetPack[];
    }
  | {
      type: 'getGemSetPackTuple:done';
      answer: GemSetPackTuple;
    };
