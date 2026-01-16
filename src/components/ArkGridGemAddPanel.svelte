<script lang="ts">
  import { ArkGridAttrs } from '../lib/constants/enums';
  import {
    type ArkGridGemOptionType,
    ArkGridGemOptionTypes,
  } from '../lib/models/arkGridGems';
  import { addGem, appConfig } from '../lib/store';

  // 젬 추가

  // 라디오 버튼 형태로 주어진 범위만큼 입력 가능하게 하는 것들
  type IntegerInputDef = {
    key: string;
    min: number;
    max: number;
  };
  /* 의지력, 포인트 입력 */
  const mainOptionInputs: IntegerInputDef[] = [
    { key: '필요 의지력', min: 3, max: 7 },
    { key: '활성 포인트', min: 1, max: 5 },
  ];
  /* 공용 옵션 입력 */
  const subOptionInputs: IntegerInputDef[] = Object.values(
    ArkGridGemOptionTypes
  ).map((v) => ({
    key: v,
    min: 0,
    max: 5,
  }));

  // states
  let gemAttr = $state(ArkGridAttrs.Order);
  const mainOptionValues: Record<string, number> = $state(
    Object.fromEntries(mainOptionInputs.map((f) => [f.key, f.min]))
  );
  const subOptionValues: Record<string, number> = $state(
    Object.fromEntries(subOptionInputs.map((f) => [f.key, f.min]))
  );
  // subOptionValues는 radio input에 의해서 값이 변경될 때 invalidate되어서
  // 아래 selectedCount는 매번 계산되도록 반응형 변수로 설정
  let selectedCount: number = $derived(
    Object.values(subOptionValues).filter((v) => v > 0).length
  );

  // 특정 옵션 종류의 특정 값이 선택 가능한지 한 번에 계산
  // 사용법: canSelectMap[옵션 종류][값] = true / false
  let canSelectMap: Record<string, Record<number, boolean>> = $derived(
    Object.fromEntries(
      Object.entries(subOptionValues).map(([optionType, currentValue]) => [
        optionType,
        Array(6) // 값 범위는 0~5
          .fill(false)
          .map((_, i) => {
            // 값 0은 항상 선택 가능 (선택 해제용)
            if (i === 0) return true;
            // 현재 옵션에 대해 이미 1이상으로 선택이 되어 있다면
            // 옵션 내부에선 자유롭게 값을 변경 가능
            if (currentValue > 0) return true;
            // 이외 값들에 대해서는,
            // 현재 선택된 값 종류가 2개 미만일 때만 선택 가능
            return selectedCount < 2;
          }),
      ])
    )
  );

  function handleAdd() {
    const selectedOptions = Object.entries(subOptionValues)
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => ({
        optionType: key as ArkGridGemOptionType,
        value: value,
      }));

    if (selectedOptions.length != 2) {
      return;
    }
    addGem({
      gemAttr,
      req: mainOptionValues['필요 의지력'],
      point: mainOptionValues['활성 포인트'],
      option1: selectedOptions[0],
      option2: selectedOptions[1],
    });
    /* subOption들은 리셋 */
    subOptionInputs.forEach((e) => {
      subOptionValues[e.key] = e.min;
    });
  }
</script>

<div class="panel">
  <div class="title">
    <span>수동 젬 추가</span>
    <button
      onclick={() => {
        appConfig.current.uiConfig.showGemAddPanel =
          !appConfig.current.uiConfig.showGemAddPanel;
      }}>{appConfig.current.uiConfig.showGemAddPanel ? '▲' : '▼'}</button
    >
  </div>
  {#if appConfig.current.uiConfig.showGemAddPanel}
    <div class="row">
      <span class="title">젬 타입</span>
      <label>
        <input
          type="radio"
          name="gemAttr"
          bind:group={gemAttr}
          value={ArkGridAttrs.Order}
        />
        질서
      </label>
      <label>
        <input
          type="radio"
          name="gemAttr"
          bind:group={gemAttr}
          value={ArkGridAttrs.Chaos}
        />
        혼돈
      </label>
    </div>

    <br />
    {#each mainOptionInputs as integerInput}
      <div class="row">
        <span class="title">{integerInput.key}</span>
        <div class="input-title-tuples">
          {#each Array(integerInput.max - integerInput.min + 1) as _, i}
            <label class="input-title-tuple">
              <input
                type="radio"
                name={integerInput.key}
                bind:group={mainOptionValues[integerInput.key]}
                value={integerInput.min + i}
              />
              {integerInput.min + i}
              {#if i != integerInput.max - integerInput.min}
                -
              {/if}
            </label>
          {/each}
        </div>
      </div>
    {/each}
    <br />
    {#each subOptionInputs as integerInput}
      <div class="row">
        <span class="title">{integerInput.key}</span>
        <div class="input-title-tuples">
          {#each Array(integerInput.max - integerInput.min + 1) as _, i}
            <label class="input-title-tuple">
              <input
                type="radio"
                name={integerInput.key}
                bind:group={subOptionValues[integerInput.key]}
                value={integerInput.min + i}
                disabled={!canSelectMap[integerInput.key][integerInput.min + i]}
              />
              {integerInput.min + i}
              {#if i != integerInput.max - integerInput.min}
                -
              {/if}
            </label>
          {/each}
        </div>
      </div>
    {/each}

    <button onclick={handleAdd} disabled={selectedCount != 2}>추가</button>
  {/if}
</div>

<style>
  .panel {
    position: relative; /* overlay 위치 기준 */
  }
  .panel > .row {
    /* row 내부 요소들은 가로 정렬, wrap 가능 */
    display: flex;
    flex-wrap: wrap;
    /* wrap하게 되면 세로 gap은 0.5로 살짝 더 넓게 */
    gap: 0.5rem 0.2rem;
  }

  .panel > .row > .title {
    /* row를 설명하는 title */
    font-weight: 500;
    min-width: clamp(2rem, 30%, 10rem);
    /* 고정폭 */
  }
  .panel > button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
  .panel > .row .input-title-tuples {
    /* input-title-tuple을 담고 있는 객체, wrap되어도 된다. */
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
  }

  .input-title-tuples > .input-title-tuple {
    /* label + input으로 이루어진 tuple, nowrap */
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.2em;
    /* white-space: nowrap; */
  }
</style>
