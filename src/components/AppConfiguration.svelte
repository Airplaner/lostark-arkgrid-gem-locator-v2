<script lang="ts">
  import { ArkGridAttrs, LostArkGrades } from '../lib/constants/enums';
  import { reverseLookup } from '../lib/constants/enums';
  import {
    ArkGridCoreNameTierMap,
    ArkGridCoreTypes,
    createCore,
  } from '../lib/models/arkGridCores';
  import {
    ArkGridGemNames,
    type ArkGridGemOption,
    ArkGridGemOptionTypes,
    determineGemGrade,
  } from '../lib/models/arkGridGems';
  import { type ArkGridGem } from '../lib/models/arkGridGems';
  import { LostArkOpenAPI } from '../lib/openapi/Api';
  import { apiClient } from '../lib/openapi/openapi';
  import {
    type OpenApiConfig,
    addGem,
    appConfig,
    currentCharacterProfile,
    currentProfileName,
    initArkGridCores,
  } from '../lib/store';
  import Modal from './Modal.svelte';

  let importing: boolean = $state(false);
  let templateOpenApiConfig = $state<OpenApiConfig>({});

  $effect(() => {
    if (appConfig.current.openApiConfig.jwt !== undefined) {
      const trimedJwt = appConfig.current.openApiConfig.jwt.trim();
      appConfig.current.openApiConfig.jwt = trimedJwt;
      apiClient.setSecurityData({
        jwt: trimedJwt,
      });
    }
  });

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
      const optionType = reverseLookup(ArkGridGemOptionTypes, key);
      if (!optionType) {
        throw Error('옵션 파싱 실패!');
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
      grade: gem.Grade
        ? reverseLookup(LostArkGrades, gem.Grade)
        : determineGemGrade(req, point, gemOptions[0], gemOptions[1]),
      gemAttr: isOrder ? ArkGridAttrs.Order : ArkGridAttrs.Chaos,
      req,
      point,
      option1: gemOptions[0],
      option2: gemOptions[1],
    };
  }

  async function importFromOpenAPI() {
    if (currentProfileName.current == '기본') {
      window.alert('기본 프로필에서는 가져올 수 없습니다!');
      return;
    }
    if (!appConfig.current.openApiConfig.jwt) {
      window.alert('JWT 설정 필요!');
      return;
    }

    try {
      // fetch
      const res = await apiClient.armories.armoriesGetArkGrid(
        currentProfileName.current
      );
      // apiClient가 ok가 아니라면 알아서 error로 던져줌
      // 하지만 데이터가 없는 경우 null로 오는 걸 캐치
      if (!res.data) {
        window.alert(
          `${currentProfileName.current}의 정보를 가져올 수 없습니다.`
        );
        return;
      }

      if (res.data.Slots) {
        // 코어 데이터가 존재하는 경우 갱신 시작
        currentCharacterProfile().cores = initArkGridCores();

        // 모든 slot에 대해서
        for (let coreSlot of res.data.Slots) {
          if (!coreSlot.Name || !coreSlot.Grade) {
            window.alert(
              `Open API 응답이 이상합니다. 콘솔 로그를 확인해주세요.`
            );
            console.log(coreSlot);
            continue;
          }

          // Open API 응답 -> 내부 데이터로 변환
          const attr = reverseLookup(ArkGridAttrs, coreSlot.Name.slice(0, 2));
          const ctype = reverseLookup(ArkGridCoreTypes, coreSlot.Name[4]);
          const grade = reverseLookup(LostArkGrades, coreSlot.Grade);
          const tier = ArkGridCoreNameTierMap[coreSlot.Name.slice(11)] ?? 2;

          if (!attr || !ctype || !grade) {
            window.alert(`${coreSlot.Grade} ${coreSlot.Name} 파싱 실패`);
            continue;
          }

          // 성공적으로 변환한 코어 저장
          currentCharacterProfile().cores[attr][ctype] = createCore(
            attr,
            ctype,
            grade,
            attr == ArkGridAttrs.Chaos ? tier : 0 // 혼돈만 tier 사용
          );

          // 장착 중인 젬들만 우선 추가
          // TODO 젬 목록 API
          if (coreSlot.Gems) {
            for (let gem of coreSlot.Gems) {
              addGem(parseOpenApiGem(gem));
            }
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
  let showModal = $state(false);

  function updateOpenApiConfig() {
    // 값 반영하기
    appConfig.current.openApiConfig = { ...templateOpenApiConfig };
  }

  $effect(() => {
    // 처음 열 때 가져오기
    templateOpenApiConfig = { ...appConfig.current.openApiConfig };
  });
</script>

<Modal bind:showModal onConfirm={updateOpenApiConfig}>
  {#snippet header()}
    <h2>OpenAPI 설정</h2>
  {/snippet}
  {#snippet children()}
    <div class="body">
      <div class="row">
        <label>
          <span class="title">JWT: </span>
          <input bind:value={templateOpenApiConfig.jwt} />
        </label>
      </div>
      <div class="row">
        <a href="https://developer-lostark.game.onstove.com/" target="_blank"
          >토큰 발급 경로</a
        >
      </div>
    </div>
  {/snippet}
</Modal>
<div class="buttons">
  <button onclick={() => (showModal = true)}>Open API 설정</button>
  <button onclick={importFromOpenAPI}>데이터 가져오기</button>
</div>

<style>
  .buttons {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: right;
  }
  .body {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
  }
  .row > label > .title {
    display: inline-block;
    min-width: 5em;
  }
  .row > label > input {
    width: 200px;
  }
</style>
