<script lang="ts">
  import CharacterProfileEditor from './components/CharacterProfileEditor.svelte';
  import GemDetectPanel from './components/GemDetectPanel.svelte';
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
  <div class="contents">
    <!-- <h3>아크그리드 젬 배치기</h3> -->
    <AppConfiguration></AppConfiguration>
    <ProfileEdit></ProfileEdit>
    <GemDetectPanel></GemDetectPanel>
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
</style>
