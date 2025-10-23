<script lang="ts">
  import {
    addGem,
    ArkGridGemAttr,
    ArkGridGemOptionType,
    type ArkGridGemOption,
  } from '../stores/arkGridGems';

  let gemAttr: ArkGridGemAttr = ArkGridGemAttr.Order;
  let name: string = '테스트젬';

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
  const mainOptionValues: Record<string, number> = mainOptionInputs.reduce(
    (acc, f) => {
      acc[f.key] = f.min;
      return acc;
    },
    {} as Record<string, number>
  );

  /* 공용 옵션 입력 */
  const subOptionInputs: IntegerInputDef[] = Object.values(ArkGridGemOptionType).map((v) => ({
    key: v as string,
    min: 0,
    max: 5,
  }));

  const subOptionValues: Record<string, number> = subOptionInputs.reduce(
    (acc, f) => {
      acc[f.key] = f.min;
      return acc;
    },
    {} as Record<string, number>
  );
  // subOptionValues는 radio input에 의해서 값이 변경될 때 invalidate되어서
  // 아래 selectedCount는 매번 계산되도록 반응형 변수로 설정
  $: selectedCount = Object.values(subOptionValues).filter((v) => v > 0).length;

  // 특정 옵션 종류의 특정 값이 선택 가능한지 한 번에 계산
  // 사용법: canSelectMap[옵션 종류][값] = true / false
  $: canSelectMap = Object.fromEntries(
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
  );

  function handleAdd() {
    const selectedOptions = Object.entries(subOptionValues)
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => ({ optionType: key as ArkGridGemOptionType, value: value }));

    if (selectedOptions.length != 2) {
      window.alert('값 두 개 필요!');
      return;
    }
    addGem(
      name,
      gemAttr,
      mainOptionValues['필요 의지력'],
      mainOptionValues['활성 포인트'],
      selectedOptions[0],
      selectedOptions[1]
    );
    /* subOption들은 리셋 */
    subOptionInputs.forEach((e) => {
      subOptionValues[e.key] = e.min;
    });
  }
</script>

<div class="panel">
  <!-- <div class="row">
    <span class="title">이름</span>
    <input placeholder="Name" bind:value={name} />
  </div> -->
  <div class="row">
    <span class="title">젬 타입</span>
    <label>
      <input type="radio" name="gemAttr" bind:group={gemAttr} value={ArkGridGemAttr.Order} />
      질서
    </label>
    <label>
      <input type="radio" name="gemAttr" bind:group={gemAttr} value={ArkGridGemAttr.Chaos} />
      혼돈
    </label>
  </div>

  <br />
  {#each mainOptionInputs as integerInput}
    <div class="row">
      <span class="title">{integerInput.key}</span>
      {#each Array(integerInput.max - integerInput.min + 1) as _, i}
        <label>
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
  {/each}
  <br />
  {#each subOptionInputs as integerInput}
    <div class="row">
      <span class="title">{integerInput.key}</span>
      {#each Array(integerInput.max - integerInput.min + 1) as _, i}
        <label>
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
  {/each}

  <button on:click={handleAdd} disabled={selectedCount != 2}>추가</button>
</div>

<style>
  button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
</style>
