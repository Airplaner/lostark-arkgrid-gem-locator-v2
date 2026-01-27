<script lang="ts">
  import { SvelteToast } from '@zerodevx/svelte-toast';
  import { onMount } from 'svelte';

  import CharacterProfileEditor from './components/CharacterProfileEditor.svelte';
  import GemRecognitionPanel from './components/GemRecognitionPanel.svelte';
  import Credit from './components/footer/Credit.svelte';
  import Policy from './components/footer/Policy.svelte';
  import Terms from './components/footer/Terms.svelte';
  import AppConfiguration from './components/header/AppConfiguration.svelte';
  import ProfileEdit from './components/header/ProfileEditor.svelte';
  import { DISCORD_URL, KAKAOTALK_URL } from './lib/constants/enums';
  import { appConfig, enableDarkMode } from './lib/state/appConfig.state.svelte';
  import { type CharacterProfile, getCurrentProfile } from './lib/state/profile.state.svelte';

  let currentProfile = $state<CharacterProfile>(getCurrentProfile());
  $effect(() => {
    currentProfile = getCurrentProfile();
  });
  let dialog = $state<HTMLDialogElement>();
  type Footers = 'credit' | 'policy' | 'terms';
  let currentFooter = $state<Footers | null>(null);

  const openDialong = (component: Footers) => {
    currentFooter = component;
    if (dialog) dialog.showModal();
  };

  const closeDialog = () => {
    if (dialog) dialog.close();
    currentFooter = null;
  };

  $effect(() => {
    document.documentElement.classList.toggle('dark-mode', appConfig.current.uiConfig.darkMode);
  });

  onMount(() => {
    // data-track 이라는 attr이 달린 것만 수집
    if (import.meta.env.PROD) {
      document.addEventListener('click', (e) => {
        const el = e.target as HTMLElement | null;
        const target = el?.closest('[data-track]');
        if (!target) return; // data-track 없는 건 무시

        const label = (target as HTMLElement).dataset.track; // data-track 값
        (window as any).gtag('event', 'click', {
          event_label: label,
        });
      });
    }

    // 다크 모드
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      enableDarkMode();
    }
  });
</script>

<main>
  <SvelteToast options={{ reversed: true, intro: { y: 192 } }} />
  <div class="contents">
    <div class="title">아크 그리드 전투력 최적화</div>
    <AppConfiguration></AppConfiguration>
    <ProfileEdit></ProfileEdit>
    <GemRecognitionPanel></GemRecognitionPanel>
    <CharacterProfileEditor bind:profile={currentProfile}></CharacterProfileEditor>
  </div>
</main>

<footer>
  <a class="footer-link" href="#credits" onclick={() => openDialong('credit')}>Credits</a>

  <a class="footer-link" href="#privacy" onclick={() => openDialong('policy')}>Privacy Policy</a>

  <a class="footer-link" href="#terms" onclick={() => openDialong('terms')}>Terms</a>
  <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="footer-link">
    <i class="fa-brands fa-discord"></i>
    Discord
  </a>
  <a href={KAKAOTALK_URL} target="_blank" rel="noopener noreferrer" class="footer-link">
    <i class="fa-brands fa-kakao-talk"></i>
    Kakaotalk
  </a>
</footer>

<dialog
  class="footer-dialog"
  bind:this={dialog}
  onclick={(e) => {
    if (e.target === dialog) closeDialog();
  }}
>
  {#if currentFooter === 'credit'}
    <Credit />
  {:else if currentFooter === 'policy'}
    <Policy />
  {:else if currentFooter === 'terms'}
    <Terms />
  {/if}
</dialog>

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
    font-size: 0.8rem;
    display: flex;
    flex-direction: row;
    text-align: center;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }
  .footer-dialog {
    width: 20rem;
  }
  .footer-link {
    color: #9ca3af; /* 은은한 회색 */
    text-decoration: none; /* 밑줄 제거 */
    cursor: pointer;
  }
</style>
