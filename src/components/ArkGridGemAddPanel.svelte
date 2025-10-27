<script lang="ts">
  import { ArkGridAttr, ArkGridGrade } from '../lib/constants/enums';
  import {
    ArkGridGemNames,
    type ArkGridGemOption,
    ArkGridGemOptionType,
    addGem,
  } from '../lib/models/arkGridGems';
  import { type ArkGridGem } from '../lib/models/arkGridGems';
  import { LostArkOpenAPI } from '../lib/openapi/Api';
  import { apiClient } from '../lib/openapi/openapi';
  import { globalAppConfig, globalOpenApiConfig } from '../stores/store';

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
    ArkGridGemOptionType
  ).map((v) => ({
    key: v as string,
    min: 0,
    max: 5,
  }));

  // states

  // 젬 로딩
  let importing: boolean = $state(false);

  let gemAttr: ArkGridAttr = $state(ArkGridAttr.Order);
  const mainOptionValues: Record<string, number> = $state(
    mainOptionInputs.reduce(
      (acc, f) => {
        acc[f.key] = f.min;
        return acc;
      },
      {} as Record<string, number>
    )
  );
  const subOptionValues: Record<string, number> = $state(
    subOptionInputs.reduce(
      (acc, f) => {
        acc[f.key] = f.min;
        return acc;
      },
      {} as Record<string, number>
    )
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

  function parseOpenApiGem(gem: LostArkOpenAPI.ArkGridGem): ArkGridGem {
    // OpenAPI Gem의 tooltip 파싱

    // 1️⃣ HTML 태그 제거
    if (!gem.Tooltip) {
      throw Error('ToolTip 존재');
    }
    const textOnly = gem.Tooltip.replace(/<[^>]*>/g, '');

    let gemName: string | undefined = undefined;
    for (const candidateName of ArkGridGemNames) {
      if (textOnly.includes(candidateName)) {
        gemName = candidateName;
      }
    }
    if (!gemName) {
      throw Error('이름 없음');
    }

    const gemGrade = Object.values(ArkGridGrade).find((v) => v === gem.Grade);

    // 2️⃣ 특정 문구에서 정수 추출
    let req = 0,
      point = 0,
      isOrder: boolean | undefined = undefined;

    // 필요한 의지력
    const willMatch = textOnly.match(/필요 의지력 : (\d+)/);
    if (willMatch) {
      req = parseInt(willMatch[1], 10);
    } else {
      throw Error('의지력 파싱 실패');
    }

    // 질서 & 혼돈 포인트
    const orderMatch = textOnly.match(/질서 포인트 : (\d+)/);
    const chaosMatch = textOnly.match(/혼돈 포인트 : (\d+)/);

    if (orderMatch) {
      point = parseInt(orderMatch[1], 10);
      isOrder = true;
    } else {
      if (chaosMatch) {
        point = parseInt(chaosMatch[1], 10);
        isOrder = false;
      } else {
        throw Error('질서 혼돈 포인트 파싱 실패');
      }
    }

    // 3️⃣ [낙인력] Lv.4 등 키-값 쌍 추출
    const keyLevelRegex = /\[([^\]]+)] Lv\.(\d+)/g;
    const gemOptions: ArkGridGemOption[] = [];
    let match;
    while ((match = keyLevelRegex.exec(textOnly)) !== null) {
      const key = match[1].trim();
      const value = parseInt(match[2], 10);
      const optionType = Object.values(ArkGridGemOptionType).find(
        (v) => v === key
      );
      if (!optionType) {
        throw Error('알 수 없는 효과');
      }
      gemOptions.push({
        optionType,
        value,
      });
    }
    if (gemOptions.length < 2) {
      throw Error('공용 옵션의 수가 부족합니다.');
    }
    return {
      name: gemName,
      grade: gemGrade,
      gemAttr: isOrder ? ArkGridAttr.Order : ArkGridAttr.Chaos,
      req,
      point,
      option1: gemOptions[0],
      option2: gemOptions[1],
    };
  }

  async function importGemFromOpenAPI() {
    // OpenAPI로 장착된 코어에서만 젬 가져오기 (임시용)
    if (!$globalOpenApiConfig.charname) return;

    importing = true; // spinner 켜기

    try {
      const res = await apiClient.armories.armoriesGetArkGrid(
        $globalOpenApiConfig.charname
      );
      if (!res.data) {
        window.alert(
          `${$globalOpenApiConfig.charname}의 정보를 가져올 수 없습니다.`
        );
        return;
      }
      if (res.data.Slots) {
        for (let coreSlot of res.data.Slots) {
          if (!coreSlot.Gems) {
            continue;
          }
          for (let gem of coreSlot.Gems) {
            addGem(parseOpenApiGem(gem));
          }
        }
      }
    } catch (e) {
      window.alert('Open API 요청 실패!');
      console.error(e);
      return;
    } finally {
      importing = false;
    }
  }
</script>

<div class="panel">
  <div class="title">
    <span>수동 젬 추가</span>
    <button
      onclick={() => {
        $globalAppConfig.showGemAddPanel = !$globalAppConfig.showGemAddPanel;
      }}>{$globalAppConfig.showGemAddPanel ? '▲' : '▼'}</button
    >
  </div>
  {#if importing}
    <div class="overlay">
      <div class="spinner"></div>
    </div>
  {/if}
  {#if $globalAppConfig.showGemAddPanel}
    <div class="row">
      <span class="title">젬 타입</span>
      <label>
        <input
          type="radio"
          name="gemAttr"
          bind:group={gemAttr}
          value={ArkGridAttr.Order}
        />
        질서
      </label>
      <label>
        <input
          type="radio"
          name="gemAttr"
          bind:group={gemAttr}
          value={ArkGridAttr.Chaos}
        />
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

    <button onclick={handleAdd} disabled={selectedCount != 2}>추가</button>
  {/if}
</div>

<style>
  .panel {
    position: relative; /* overlay 위치 기준 */
  }
  .panel > .row {
    /* row 내부 요소들은 가로 정렬 */
    display: flex;
    gap: 0.2rem;
  }

  .panel > .row > .title {
    /* row를 설명하는 title */
    font-weight: 500;
    min-width: 10em;
    /* 고정폭 */
  }
  .panel > button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: flex-end;
  }
</style>
