<script lang="ts">
  import {
    addGem,
    ArkGridGemAttr,
    ArkgridGemOptionType,
    type ArkgridGemOption,
  } from '../stores/arkgridGems';

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
  const subOptionInputs: IntegerInputDef[] = Object.values(ArkgridGemOptionType).map((v) => ({
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

  function selectedCount() {
    // subOption 중 선택된 옵션 수 계산
    return Object.values(subOptionValues).filter((v) => v > 0).length;
  }

  function canSelect(name: string, val: number) {
    // 현재 name과 val에 해당하는 radio input을 수정할 수 있는가?
    if (val === 0) return true; // 0은 항상 선택 가능 (값 해제용)
    if (subOptionValues[name] > 0) return true; // 기존 선택은 항상 변경 가능
    return selectedCount() < 2; // 현재 선택된 옵션이 2개 미만일 때만
  }

  function handleAdd() {
    const selectedOptions = Object.entries(subOptionValues)
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => ({ optionType: key as ArkgridGemOptionType, value: value }));

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
            disabled={!canSelect(integerInput.key, integerInput.min + i)}
          />
          {integerInput.min + i}
          {#if i != integerInput.max - integerInput.min}
            -
          {/if}
        </label>
      {/each}
    </div>
  {/each}

  <button on:click={handleAdd}>추가</button>
</div>

<style>
</style>
