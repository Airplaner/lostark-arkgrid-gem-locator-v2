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
    <div class="title">아크 그리드 최적화</div>
    <AppConfiguration></AppConfiguration>
    <ProfileEdit></ProfileEdit>
    <GemRecognitionPanel></GemRecognitionPanel>
    <CharacterProfileEditor bind:profile={currentProfile}
    ></CharacterProfileEditor>
  </div>
</main>

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
  }
  :root {
    --toastContainerTop: auto;
    --toastContainerRight: auto;
    --toastContainerBottom: 8rem;
    --toastContainerLeft: calc(50vw - 8rem);
  }
</style>
