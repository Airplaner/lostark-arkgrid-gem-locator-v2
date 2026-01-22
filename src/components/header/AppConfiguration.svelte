<script lang="ts">
  import { toast } from '@zerodevx/svelte-toast';
  import { onMount } from 'svelte';

  import {
    ArkGridAttrs,
    DEFAULT_PROFILE_NAME,
    LostArkGrades,
  } from '../../lib/constants/enums';
  import { reverseLookup } from '../../lib/constants/enums';
  import {
    ArkGridCoreNameTierMap,
    ArkGridCoreTypes,
    createCore,
  } from '../../lib/models/arkGridCores';
  import {
    ArkGridGemNames,
    type ArkGridGemOption,
    ArkGridGemOptionTypes,
    determineGemGrade,
  } from '../../lib/models/arkGridGems';
  import { type ArkGridGem } from '../../lib/models/arkGridGems';
  import { LostArkOpenAPI } from '../../lib/openapi/Api';
  import { apiClient } from '../../lib/openapi/openapi';
  import {
    appConfig,
    toggleUI,
    updateOpenApiJWT,
  } from '../../lib/state/appConfig.state.svelte';
  import {
    addGem,
    clearCores,
    clearGems,
    currentProfileName,
    updateCore,
    updateIsSupporter,
  } from '../../lib/state/profile.state.svelte';

  let importing: boolean = $state(false);

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
    if (
      !window.confirm(
        `⚠️ 현재 프로필을 초기화합니다. ⚠️\n${currentProfileName.current == DEFAULT_PROFILE_NAME ? '입력할' : currentProfileName.current} 캐릭터의 장착된 아크 그리드 정보를 가져와 현재 프로필에 덮어 씌웁니다. 진행하시겠습니까?`
      )
    ) {
      return;
    }
    if (!appConfig.current.openApiConfig.jwt) {
      window.alert('OpenAPI JWT가 설정되어 있지 않습니다.');
      return;
    }
    let characterName = null;
    if (currentProfileName.current == DEFAULT_PROFILE_NAME) {
      characterName = window.prompt(
        '정보를 가져올 캐릭터 이름을 입력해주세요.'
      );
      if (characterName === null || characterName.length == 0) return;
    } else {
      characterName = currentProfileName.current;
    }
    if (characterName === null) return;
    characterName = characterName.trim();

    try {
      // fetch
      const res = await apiClient.armories.armoriesGetProfileAll(
        characterName,
        { filters: 'arkpassive+arkgrid' }
      );
      // apiClient가 ok가 아니라면 알아서 error로 던져줌
      // 하지만 데이터가 없는 경우 null로 오는 걸 캐치
      if (!res.data) {
        window.alert(
          `${currentProfileName.current}의 정보를 가져올 수 없습니다.`
        );
        return;
      }
      const arkpassive: LostArkOpenAPI.ArkPassive | undefined =
        res.data.ArkPassive;
      const arkgrid: LostArkOpenAPI.ArkGrid | undefined = res.data.ArkGrid;
      let isSupporter = false;
      if (arkpassive) {
        const title = arkpassive.Title;
        if (
          title == '만개' ||
          title == '절실한 구원' ||
          title == '축복의 오라 ' ||
          title == '해방자'
        ) {
          isSupporter = true;
        }
      }
      if (arkgrid?.Slots) {
        // 코어 데이터가 존재하는 경우 갱신 시작
        clearCores();
        clearGems();

        // 모든 slot에 대해서
        for (const coreSlot of arkgrid.Slots) {
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

          if (!attr || !ctype || !grade) {
            window.alert(`${coreSlot.Grade} ${coreSlot.Name} 파싱 실패`);
            continue;
          }
          // 내부적으로 구분하는 tier
          // 알 수 없으면 2 (그 외)
          let tier = ArkGridCoreNameTierMap[coreSlot.Name.slice(11)] ?? 2;

          // 특별 처리: 무기 코어 딜러는 1, 서폿은 0
          if (isSupporter && coreSlot.Name.slice(11) == '무기') {
            tier = 0;
          }
          // 질서는 tier 없음
          if (attr == ArkGridAttrs.Order) {
            tier = 0;
          }

          // 성공적으로 변환한 코어 저장
          updateCore(
            attr,
            ctype,
            createCore(attr, ctype, grade, isSupporter, tier)
          );

          // 장착 중인 젬 추가
          // TODO 젬 목록 API
          if (coreSlot.Gems) {
            for (let gem of coreSlot.Gems) {
              addGem(parseOpenApiGem(gem));
            }
          }
        }
      }
      updateIsSupporter(isSupporter);
      toast.push(`데이터 가져오기 완료.`);
    } catch (e) {
      window.alert(`Open API 요청 실패!\n${e.error.Message}`);
      console.error(e);
      return;
    } finally {
      importing = false;
    }
  }

  function updateOpenApiConfig() {
    // 값 반영하기
    let jwtInput = window.prompt(
      '로스트아크 OpenAPI JWT를 입력해주세요',
      appConfig.current.openApiConfig.jwt
    );
    if (!jwtInput) {
      return;
    }
    if (jwtInput == appConfig.current.openApiConfig.jwt) return;
    updateOpenApiJWT(jwtInput);
    toast.push('OpenAPI JWT 갱신 완료');
  }
  onMount(() => {
    const jwt = appConfig.current.openApiConfig.jwt;
    if (jwt) {
      apiClient.setSecurityData({ jwt });
    }
  });
</script>

<div class="buttons">
  <button onclick={updateOpenApiConfig}>Open API 설정</button>
  <button onclick={importFromOpenAPI}>데이터 가져오기</button>
  <button
    hidden={!appConfig.current.uiConfig.debugMode}
    onclick={() => toggleUI('debugMode')}
    >개발자 모드 {appConfig.current.uiConfig.debugMode
      ? '끄기'
      : '켜기'}</button
  >
</div>

<style>
  .buttons {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: right;
  }
</style>
