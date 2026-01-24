<script lang="ts">
  import { SvelteToast } from '@zerodevx/svelte-toast';

  import CharacterProfileEditor from './components/CharacterProfileEditor.svelte';
  import GemRecognitionPanel from './components/GemRecognitionPanel.svelte';
  import AppConfiguration from './components/header/AppConfiguration.svelte';
  import ProfileEdit from './components/header/ProfileEditor.svelte';
  import {
    type CharacterProfile,
    getCurrentProfile,
  } from './lib/state/profile.state.svelte';

  let currentProfile = $state<CharacterProfile>(getCurrentProfile());
  $effect(() => {
    currentProfile = getCurrentProfile();
  });
</script>

<main>
  <SvelteToast options={{ reversed: true, intro: { y: 192 } }} />
  <div class="contents">
    <div class="title">아크 그리드 전투력 최적화</div>
    <AppConfiguration></AppConfiguration>
    <ProfileEdit></ProfileEdit>
    <GemRecognitionPanel></GemRecognitionPanel>
    <CharacterProfileEditor bind:profile={currentProfile}
    ></CharacterProfileEditor>
  </div>
</main>

<footer>
  게임 관련 이미지 및 명칭의 저작권은 스마일게이트에 있습니다. 계산 로직 및
  사이트 소스 코드는 개발자의 저작물이며, 비상업적 팬사이트로 운영됩니다.
  권리자가 요청할 경우 해당 콘텐츠는 즉시 삭제됩니다.
</footer>

<style>
  .contents {
    display: flex;
    flex-direction: column;
    gap: var(--global-gap);
    /* 넓을 땐 20px 패딩, 960px 이후 (세로 레아이웃) 점점 좁아짐 */
    padding: clamp(8px, 2.083vw, 20px);
  }
  .contents .title {
    font-weight: 700;
    font-size: 3rem;
    text-align: center;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
  :root {
    --toastContainerTop: auto;
    --toastContainerRight: auto;
    --toastContainerBottom: 8rem;
    --toastContainerLeft: calc(50vw - 8rem);
  }
  footer {
    font-size: 0.9rem;
    text-align: center;
  }
</style>
