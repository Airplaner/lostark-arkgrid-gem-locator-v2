<script lang="ts">
  import type { LocalizationName } from '../../lib/constants/enums';
  import { appConfig, toggleUI } from '../../lib/state/appConfig.state.svelte';
  import { appLocale } from '../../lib/state/locale.state.svelte';

  const guideAssets = import.meta.glob<string>('/src/assets/guide/*', {
    eager: true,
    import: 'default',
  });
  const LTitle: LocalizationName = {
    ko_kr: '가이드',
    en_us: 'Guide',
  };
  let locale = $derived(appLocale.current);
</script>

<div class="guide">
  <div class="title">
    <span>🎓️ {LTitle[locale]}</span>
    <button class="fold-button" onclick={() => toggleUI('showGemRecognitionGuide')}
      >{appConfig.current.uiConfig.showGemRecognitionGuide ? '▲' : '▼'}</button
    >
  </div>
  <div class="content" hidden={!appConfig.current.uiConfig.showGemRecognitionGuide}>
    {#if locale === 'ko_kr'}
      <p>
        1. 게임에서 젬 목록 화면을 연 뒤 <b>모든 젬을 장착 해제</b>해주세요.<br />
        안 쓰는 아크 그리드 프리셋으로 전환하는 것으로 손쉽게 젬을 해제할 수 있습니다.
      </p>
      <p>2. [🖥️ 화면 공유 시작] 버튼을 통해 로스트아크 게임 화면을 공유해주세요</p>
      <p>3. 스크롤을 내리면서 인식된 젬이 목록에 추가되는 것을 확인해주세요.</p>
      <p>
        4. 수집된 젬의 개수를 확인하고, <b>질서와 혼돈 모든 젬</b>이 수집되었으면 [✅ 현재 프로필에
        반영] 버튼을 눌러 프로필에 저장해주세요.
      </p>
      <br />
      <h2>FAQ</h2>
      <p>
        Q. 화면 공유에 실패하거나 거부하였다고 나옵니다.<br />
        A. 데스크톱 환경에서 크롬 혹은 엣지 브라우저로 실행해주세요.
      </p>
      <p>
        Q. 젬이 인식되지 않습니다.<br />
        A. [🔨 공유 중인 화면 보기]를 눌러 다음 사항을 확인해주세요.
      </p>
      <ol>
        <li>게임 화면이 올바르게 갱신 중인지 확인해주세요.</li>
        <li>
          젬 옵션을 추출하는 영역이 실제 위치와 일치하지 않는다면 게임 해상도를 "1920x1080 (16:9)"로
          화면을 "창 모드"로 변경해주세요. "21:9 강제 설정"을 사용 중이라면 해제해주세요.
        </li>
        <li>
          젬 옵션을 추출하는 영역이 빨갛게 되어 있다면 상단 '허용 오차 범위' 슬라이더를 높혀서
          시도해주세요.
        </li>
        <li>마우스가 젬과 상호작용하지 않도록 스크롤 위에 위치시킨 채로 스크롤을 조작해주세요.</li>
        <br />
      </ol>

      <p>
        Q. Out of Memory 오류가 발생합니다.<br />
        A. 고대 코어가 많거나 젬이 많을 경우 계산량이 많아서 생기는 문제입니다. 최적화 알고리즘 자체의
        한계로 개선 중에 있습니다. 코어별 최소 포인트 설정을 18, 19, 20으로 설정해주시거나 불필요한 젬을
        제거해주고 시도해주세요.
      </p>
      <p>혹은 사이트 하단 카카오톡을 통해 문의 부탁드립니다.</p>
    {/if}{#if locale === 'en_us'}
      <div class="content">
        <p>
          1. Open an Astrogem list and unequip all.<br />
          You can switch to an unused Ark Grid preset to quickly unequip all astrogems.
        </p>
        <p>2. Press the [🖥️ Start Screen Sharing] button to share your Lost Ark game screen.</p>
        <p>3. Scroll down and check that recognized astrogems are being added to the list.</p>
        <p>
          4. Verify the total number of collected astrogems. Once <b
            >all Order and Chaos astrogems</b
          >
          have been collected, click the [✅ Apply to Current Profile] button to save them to your profile.
        </p>
        <br />
        <h2>FAQ</h2>
        <p>
          Q. I get a message saying screen sharing failed or was denied.<br />
          A. Please use Chrome or Edge browser.
        </p>
        <p>
          Q. Astrogems are not being recognized.<br />
          A. Press the [🔨 Display Shared Screen] and check the following:
        </p>
        <ol>
          <li>Make sure the game screen is updating properly.</li>
          <li>
            If the area used to extract astrogem options does not match the actual screen, set the
            game resolution to "1920x1080 (16:9)" and switch to "windowed mode". If you are using
            "Force 21:9 Aspect Ratio", please disable it.
          </li>
          <li>
            If parts of the extraction area are highlighted in red, try increasing the “Recognition
            Tolerance Range” slider at the top.
          </li>
          <li>
            Scroll while keeping the mouse cursor positioned over the scrollbar, so it does not
            interact with the astrogems.
          </li>
        </ol>
        <p>
          Q. I encounter an "Out of Memory" error.<br />
          A. This may occur when there are many Ancient Cores or astrogems, resulting in heavy computation.
          It is a limitation of the current optimization algorithm and is being improved. Please try
          setting the Minimum Core Points to 18, 19, or 20, or remove unnecessary astrogems before trying
          again.
        </p>
        <p>Alternatively, you can contact us via Discord in the site footer.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .guide {
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 0.4rem;
    background-color: var(--card-inner);
    padding: 1rem;
    width: 100%;
    box-sizing: border-box;
    gap: 10px;
    display: flex;
    flex-direction: column;
  }
  .guide > .title {
    font-weight: 700;
    font-size: 1.4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.4rem;
  }
  /* .guide img {
    max-width: 100%;
    height: auto;
    display: block;
  } */
  .fold-button {
    flex: 1;
    text-align: right;
    border: none;
    background: none;
  }
</style>
