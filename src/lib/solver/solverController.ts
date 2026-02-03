import { ArkGridGemOptionTypes } from '../models/arkGridGems';
import type { SolverWorkerRequest, SolverWorkerResponse } from './types';

// 이론상 최대 전투력을 구하기 위한 종결젬들
const perfectGems = [
  {
    req: 3,
    point: 5,
    option1: { optionType: '공격력', value: 5 },
    option2: {
      optionType: '추가 피해',
      value: 5,
    },
  },
  {
    req: 4,
    point: 5,
    option1: { optionType: '공격력', value: 5 },
    option2: {
      optionType: '보스 피해',
      value: 5,
    },
  },
  {
    req: 5,
    point: 5,
    option1: {
      optionType: '추가 피해',
      value: 5,
    },
    option2: {
      optionType: '보스 피해',
      value: 5,
    },
  },
];

const perfectGemsSupporter = [
  {
    req: 3,
    point: 5,
    option1: { optionType: '낙인력', value: 5 },
    option2: {
      optionType: '아군 피해 강화',
      value: 5,
    },
  },
  {
    req: 4,
    point: 5,
    option1: { optionType: '아군 피해 강화', value: 5 },
    option2: {
      optionType: '아군 공격 강화',
      value: 5,
    },
  },
  {
    req: 5,
    point: 5,
    option1: {
      optionType: '낙인력',
      value: 5,
    },
    option2: {
      optionType: '아군 공격 강화',
      value: 5,
    },
  },
];

export class SolverController {
  // state
  private state: 'idle' | 'running' = 'idle';
  private workers: Worker[] = [];

  // 외부 등록 콜백
  onSolveDone: (() => void) | null = null; // 분석 완료

  constructor() {
    for (let i = 0; i < 2; i++) {
      this.workers.push(
        new Worker(new URL('./solverWorker.ts', import.meta.url), {
          type: 'module',
        })
      );
    }
  }

  // type-safe wrapper
  private postMessage(workerIndex: number, msg: SolverWorkerRequest) {
    this.workers[workerIndex]?.postMessage(msg);
  }

  private handleWorkerMessage(e: MessageEvent<SolverWorkerResponse>) {
    const data = e.data;

    switch (data.type) {
      case 'getBestGemSetPacks:done':
        break;

      case 'getGemSetPackTuple:done':
        break;
    }
  }

  RunSolve() {
    if (this.state == 'running') {
      throw Error('busy');
    }

    try {
      this.state = 'running';
      // ...
    } finally {
      this.state = 'idle';
    }
  }
}
