<script lang="ts">
  import {
    DEFAULT_PROFILE_NAME,
    L_DEFAULT_PROFILE_NAME,
    type LocalizationName,
  } from '../../lib/constants/enums';
  import {
    addNewProfile,
    appConfig,
    bigIntSerializer,
    getProfile,
  } from '../../lib/state/appConfig.state.svelte';
  import {
    type CharacterProfile,
    currentProfileName,
    deleteProfile,
    imgRoleCombat,
    imgRoleSupporter,
    initNewProfile,
    migrateProfile,
    setCurrentProfileName,
  } from '../../lib/state/profile.state.svelte';

  let locale = $derived(appConfig.current.locale);
  const LTitle: LocalizationName = {
    ko_kr: '프로필',
    en_us: 'Profile',
  };
  const LAddNewProfile: LocalizationName = {
    ko_kr: '새 프로필에 사용할 캐릭터명을 입력해주세요',
    en_us: 'Enter new profile name',
  };
  const LConfirmDeleteProfile: Record<string, (profileName: string) => string> = {
    ko_kr: (name) => `"${name}" 프로필을 삭제하시겠습니까?`,
    en_us: (name) => `Are you sure you want to delete the "${name}" profile?`,
  };
</script>

<div class="root">
  <div class="title">👤 {LTitle[locale]}</div>
  <div class="buttons">
    {#each appConfig.current.characterProfiles as profile}
      <button
        class="profile-select-button"
        onclick={() => setCurrentProfileName(profile.characterName)}
        class:active={profile.characterName === currentProfileName.current}
      >
        {profile.characterName === DEFAULT_PROFILE_NAME
          ? L_DEFAULT_PROFILE_NAME[locale]
          : profile.characterName}
        {#if profile.characterName !== DEFAULT_PROFILE_NAME}
          <img src={profile.isSupporter ? imgRoleSupporter : imgRoleCombat} alt="role" />
        {/if}
      </button>
    {/each}
    <button
      title="새 프로필"
      onclick={() => {
        const profileName = window.prompt(LAddNewProfile[locale]);
        if (profileName === null || profileName.length == 0) return;
        addNewProfile(initNewProfile(profileName));
        setCurrentProfileName(profileName);
      }}
      data-track="add-profile">📄</button
    >
    <button
      title="현재 프로필 삭제"
      onclick={() => {
        if (window.confirm(LConfirmDeleteProfile[locale](currentProfileName.current))) {
          deleteProfile(currentProfileName.current);
        }
      }}
      disabled={currentProfileName.current === DEFAULT_PROFILE_NAME}>🗑️</button
    >
    <button
      title="현재 프로필 내보내기"
      hidden={!appConfig.current.uiConfig.debugMode}
      onclick={() => {
        const jsonStr = bigIntSerializer.stringify(getProfile(currentProfileName.current));

        // 2. Blob 생성
        const blob = new Blob([jsonStr], { type: 'application/json' });

        // 3. 다운로드 링크 생성
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProfileName.current}.json`;
        document.body.appendChild(a);
        a.click();

        // 4. 정리
        a.remove();
        URL.revokeObjectURL(url);
      }}>💾</button
    >
    <button
      title="프로필 불러오기"
      hidden={!appConfig.current.uiConfig.debugMode}
      onclick={() => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json'; // JSON만 선택 가능

        // 2. 파일 선택 후 처리
        fileInput.addEventListener('change', (event) => {
          const target = event.target as HTMLInputElement; // 여기서 단언
          const file = target.files?.[0]; // optional chaining 안전하게
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data: CharacterProfile = bigIntSerializer.parse(e.target?.result as string);
              migrateProfile(data);
              if (addNewProfile(data)) {
                alert('✅ 프로필 추가 성공!');
                currentProfileName.current = data.characterName;
              } else {
                alert('❌ 프로필 추가 실패');
              }
            } catch (err) {
              alert('❌ JSON 형식 오류');
            }
          };
          reader.readAsText(file);
          // 3. input 제거
          fileInput.remove();
        });
        // 4. 클릭해서 파일 선택 창 열기
        fileInput.click();
      }}
    >
      📂
    </button>
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    user-select: none;
    flex-wrap: wrap;
  }
  .title {
    font-weight: 700;
    font-size: 1.4rem;
  }
  .profile-select-button {
    /* 추가, 삭제 버튼과 구분되게 좀 크게 */
    height: 2.6rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.2rem;
    box-sizing: border-box;
  }
  .profile-select-button > img {
    height: 1.2rem;
    box-sizing: border-box;
  }
  .buttons {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  button {
    background-color: var(--card);
  }
  button:hover {
    background-color: var(--card-innner);
  }
  button.active {
    background-color: var(--card-innner);
    font-weight: bold;
    border: 2px solid;
  }
</style>
