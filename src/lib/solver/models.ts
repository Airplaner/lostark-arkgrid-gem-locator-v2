export class Core {
  constructor(
    public energy: number,
    public point: number,
    public coeff: number[]
  ) {}
}

export class Gem {
  constructor(
    public index: bigint,
    public req: number,
    public point: number,
    public att: number,
    public skill: number,
    public boss: number
  ) {}
}

export class GemSet {
  // 코어에 젬을 장착한 상태
  att: number;
  skill: number;
  boss: number;
  point: number;
  bitmask: bigint;
  coreCoeff: number;
  core: Core;
  maxScore: number;
  minScore: number;
  constructor(gems: Gem[], core: Core) {
    this.att = 0;
    this.skill = 0;
    this.boss = 0;
    this.point = 0;

    this.bitmask = 0n;
    for (const gem of gems) {
      this.bitmask |= 1n << gem.index;
      this.att += gem.att;
      this.skill += gem.skill;
      this.boss += gem.boss;
      this.point += gem.point;
    }
    this.coreCoeff = core.coeff[this.point];
    if (this.coreCoeff == undefined) {
      throw Error('Core coeffient is incorrect.');
    }
    this.core = core;
    this.minScore = -1;
    this.maxScore = -1;
  }
  setScoreRange(attMax: number, skillMax: number, bossMax: number) {
    // 모든 시스템에서 얻을 수 있는 최대 공격력, 추가 피해, 보스 피해를 알 수 있으면
    // 이 GemSet으로 얻을 수 있는 전투력의 범위를 한정할 수 있다.
    const coreScore = (this.coreCoeff + 10000) / 10000;

    // 전투력 증가 최대치: Lv. 0 -> Lv. {레벨합산}일 때
    this.maxScore =
      (((((coreScore * (Math.floor((this.att * 400) / 120) + 10000)) / 10000) *
        (Math.floor((this.skill * 700) / 120) + 10000)) /
        10000) *
        (Math.floor((this.boss * 1000) / 120) + 10000)) /
      10000;
    // 전투력 증가 최소치: Lv. {최대레벨 - 레벨합산} -> Lv. {최대레벨}일 때
    this.minScore =
      (((((coreScore * (Math.floor((attMax * 400) / 120) + 10000)) /
        (Math.floor(((attMax - this.att) * 400) / 120) + 10000)) *
        (Math.floor((skillMax * 700) / 120) + 10000)) /
        (Math.floor(((skillMax - this.skill) * 700) / 120) + 10000)) *
        (Math.floor((bossMax * 1000) / 120) + 10000)) /
      (Math.floor(((bossMax - this.boss) * 1000) / 120) + 10000);
  }
}
export class GemSetPack {
  // 질서 혹은 혼돈 3개의 코어에 대해 할당된 3개의 GemSet
  att: number;
  skill: number;
  boss: number;
  coreScore: number;
  minScore: number;
  maxScore: number;
  constructor(
    public gs1: GemSet | null,
    public gs2: GemSet | null,
    public gs3: GemSet | null,
    attMax: number,
    skillMax: number,
    bossMax: number
  ) {
    this.att = (gs1?.att ?? 0) + (gs2?.att ?? 0) + (gs3?.att ?? 0);
    this.skill = (gs1?.skill ?? 0) + (gs2?.skill ?? 0) + (gs3?.skill ?? 0);
    this.boss = (gs1?.boss ?? 0) + (gs2?.boss ?? 0) + (gs3?.boss ?? 0);

    this.coreScore =
      ((((((gs1?.coreCoeff ?? 0) + 10000) / 10000) *
        ((gs2?.coreCoeff ?? 0) + 10000)) /
        10000) *
        ((gs3?.coreCoeff ?? 0) + 10000)) /
      10000;

    this.maxScore =
      (((((this.coreScore * (Math.floor((this.att * 400) / 120) + 10000)) /
        10000) *
        (Math.floor((this.skill * 700) / 120) + 10000)) /
        10000) *
        (Math.floor((this.boss * 1000) / 120) + 10000)) /
      10000;
    this.minScore =
      (((((this.coreScore * (Math.floor((attMax * 400) / 120) + 10000)) /
        (Math.floor(((attMax - this.att) * 400) / 120) + 10000)) *
        (Math.floor((skillMax * 700) / 120) + 10000)) /
        (Math.floor(((skillMax - this.skill) * 700) / 120) + 10000)) *
        (Math.floor((bossMax * 1000) / 120) + 10000)) /
      (Math.floor(((bossMax - this.boss) * 1000) / 120) + 10000);
  }
}
export class GemSetPackTuple {
  // GemSetPack이 두 개 있는 것, 즉 완성된 하나의 아크 그리드
  att: number;
  skill: number;
  boss: number;
  score: number;
  constructor(
    public gsp1: GemSetPack | null,
    public gsp2: GemSetPack | null
  ) {
    this.att = (gsp1?.att ?? 0) + (gsp2?.att ?? 0);
    this.skill = (gsp1?.skill ?? 0) + (gsp2?.skill ?? 0);
    this.boss = (gsp1?.boss ?? 0) + (gsp2?.boss ?? 0);
    this.score =
      ((((((gsp1?.coreScore ?? 1) *
        (gsp2?.coreScore ?? 1) *
        (Math.floor((this.att * 400) / 120) + 10000)) /
        10000) *
        (Math.floor((this.skill * 700) / 120) + 10000)) /
        10000) *
        (Math.floor((this.boss * 1000) / 120) + 10000)) /
      10000;
  }
}
