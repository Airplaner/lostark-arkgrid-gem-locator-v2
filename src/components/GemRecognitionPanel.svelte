<script lang="ts">
  import { onDestroy } from 'svelte';

  import { type ArkGridAttr, ArkGridAttrs } from '../lib/constants/enums';
  import { CaptureController } from '../lib/cv/captureController';
  import { type ArkGridGem, isSameArkGridGem } from '../lib/models/arkGridGems';
  import { appConfig, toggleUI } from '../lib/state/appConfig.state.svelte';
  import GemRecognitionGemList from './GemRecognitionGemList.svelte';

  const guideImages = import.meta.glob<string>('../assets/guide/*.png', {
    eager: true,
    import: 'default',
  });
  let debugCanvas: HTMLCanvasElement | null;
  let totalOrderGems = $state<ArkGridGem[]>([]);
  let totalChaosGems = $state<ArkGridGem[]>([]);
  let isRecording = $state<boolean>(false);
  let isDebugging = $state<boolean>(false);
  let isLoading = $state<boolean>(false);
  let detectionMargin = $state<number>(0);
  const StringDetectionMargin = ['일반', '여유', '최대'];
  let gemListElem: GemRecognitionGemList | null = null;

  let _captureController: CaptureController | null = null;

  async function getCaptureController() {
    if (_captureController) return _captureController;
    _captureController = new CaptureController(debugCanvas);
    return _captureController;
  }

  function applyCurrentGems(gemAttr: ArkGridAttr, currentGems: ArkGridGem[]) {
    const totalGems = gemAttr == ArkGridAttrs.Order ? totalOrderGems : totalChaosGems;
    // 젬 추가
    const SAME_COUNT_THRESHOLD = 4;
    if (totalGems.length == 0 && currentGems.length > 0) {
      // 현재 젬이 없다면 화면에 있는 젬으로 갈아치움
      // 이땐 개수가 꼭 9개가 아니어도 됨 (애초에 젬을 적게 깎은 사람들)
      for (const gem of currentGems) {
        totalGems.push(gem);
      }
      gemListElem?.selectTab(gemAttr == ArkGridAttrs.Order ? 0 : 1);
      gemListElem?.scroll('bottom');
      // console.log($state.snapshot(totalGems));
    } else {
      if (currentGems.length == 9 && totalGems.length < 100) {
        // 정상적으로 9개의 젬이 모두 인식된 경우에만 진행

        // Q. 내 화면의 첫 젬이 전체 젬의 어디에 위치하는가?
        // 동일한 옵션의 젬이 2개 이상 있는 경우를 위해 후보를 모두 저장함
        let foundIndices: number[] = [];
        for (let i = 0; i < totalGems.length; i++) {
          if (isSameArkGridGem(totalGems[i], currentGems[0])) {
            foundIndices.push(i);
          }
        }
        // 아까 조사한 모든 index에 대해서
        // 현재 화면 중 몇 개의 젬이 이미 알고있는 젬인지 연속적으로 확인
        for (let foundIndex of foundIndices) {
          let sameCount = 1;
          for (let i = 1; i < currentGems.length; i++) {
            if (foundIndex + i >= totalGems.length) break;
            if (isSameArkGridGem(totalGems[foundIndex + i], currentGems[i])) {
              sameCount += 1;
            } else {
              break;
            }
          }
          // 현재 화면에 있는 모든 젬이 이미 연속적으로 추가된 젬인 경우, 그냥 넘어감
          if (sameCount == 9) continue;

          // 스크롤을 너무 빠르게 내린 경우를 제외하기 위해서
          // 내 화면에 있는 젬 중 최소한 4개는 이미 알고 있는 경우에만 수행
          // 추가로 동일한 옵션의 젬을 오판정한 index인 경우 sameCount = 1이라서 걸러야 함
          if (sameCount >= SAME_COUNT_THRESHOLD) {
            // 내 화면의 sameCount부터 끝에 있는 젬들까지 추가 대상임
            for (let i = sameCount; i < 9; i++) {
              totalGems.push(currentGems[i]);
              // console.log('추가:', currentGems[i]);
            }
            gemListElem?.selectTab(gemAttr == ArkGridAttrs.Order ? 0 : 1);
            gemListElem?.scroll('bottom');
            // console.log($state.snapshot(totalGems));
          }
        }

        if (foundIndices.length == 0) {
          // 만약 내 화면의 첫 젬이 아예 없다면 거꾸로 스크롤하는 것이라고 가정
          // 마지막 젬이 알고 있는지 확인
          for (let i = 0; i < totalGems.length; i++) {
            if (isSameArkGridGem(totalGems[i], currentGems[8])) {
              foundIndices.push(i);
            }
          }
          // 아까 조사한 모든 index에 대해서
          // 현재 화면 중 몇 개의 젬이 이미 알고있는 젬인지 연속적으로 확인
          for (let foundIndex of foundIndices) {
            let sameCount = 1;
            for (let i = 1; i < currentGems.length; i++) {
              if (foundIndex - i < 0) break;
              if (isSameArkGridGem(totalGems[foundIndex - i], currentGems[8 - i])) {
                sameCount += 1;
              } else {
                break;
              }
            }
            if (sameCount == 9) continue;
            if (sameCount >= SAME_COUNT_THRESHOLD) {
              // 내 화면의 0부터 9-sameCount-1에 있는 젬들까지 추가 대상임
              for (let i = 9 - sameCount - 1; i >= 0; i--) {
                totalGems.unshift(currentGems[i]);
                // console.log('추가:', currentGems[i]);
              }
              gemListElem?.selectTab(gemAttr == ArkGridAttrs.Order ? 0 : 1);
              gemListElem?.scroll('top');
              // console.log($state.snapshot(totalGems));
            }
          }
        }
      }
    }
  }

  async function startGemCapture() {
    // 젬 캡쳐 시작
    const controller = await getCaptureController();
    // UI 잠금
    isLoading = true;

    // register callbacks
    controller.onLoad = () => {
      // 로딩 끝나면 UI 로딩 해제
      isLoading = false;
    };
    controller.onStartCaptureError = (err) => {
      let msg = '알 수 없는 에러가 발생하였습니다.';
      switch (err) {
        case 'recording':
          msg = '이미 녹화 중입니다.';
          break;
        case 'screen-permission-denied':
          msg = '화면 공유를 거부하였습니다.';
          break;
        case 'worker-init-failed':
          msg = '분석 엔진을 준비하는데 실패하였습니다.';
          break;
        default:
          msg = '알 수 없는 에러가 발생하였습니다';
      }
      window.alert(msg);
      isLoading = false;
    };
    controller.onReady = () => {
      // 첫 프레임 소비 이후 초록불 ON
      isRecording = true;
    };
    controller.onFrameDone = (gemAttr, gems) => {
      // 분석 이후 현재 임시 젬 저장소에 반영
      applyCurrentGems(gemAttr, gems);
    };
    controller.onStop = () => {
      isRecording = false;
    };
    controller.startCapture();
  }

  async function stopGemCapture() {
    const controller = await getCaptureController();
    if (controller.isRecording()) {
      // controller 중단 요청 및 완료 이후 중단
      await controller.stopCapture();
      isRecording = false;
      debugCanvas?.getContext('2d')?.reset();
    }
  }
  async function toggleDrawDebug() {
    const controller = await getCaptureController();
    isDebugging = controller.toggleDrawDebug();
  }
  async function updateControllerDetectionMargin(detectionMargin: number) {
    const controller = await getCaptureController();
    controller.detectionMargin = detectionMargin;
  }
  onDestroy(async () => {
    const controller = await getCaptureController();
    await controller.stopCapture();
  });
</script>

<div class="panel">
  {#if isLoading}
    <div class="overlay">
      <div class="spinner"></div>
    </div>
  {/if}
  <div class="title">
    <div class="title-with-dot">
      <span>젬 화면 인식</span>
      <div class="status-dot" class:online={isRecording} class:offline={!isRecording}></div>
    </div>
    <button
      class="fold-button"
      onclick={() => toggleUI('showGemRecognitionPanel')}
      disabled={isRecording}
      >{appConfig.current.uiConfig.showGemRecognitionPanel ? '▼' : '▲'}</button
    >
  </div>
  <div
    class="content"
    style:display={!appConfig.current.uiConfig.showGemRecognitionPanel ? 'none' : 'flex'}
  >
    <div class="buttons">
      <div class="left">
        {#if !isRecording}
          <button onclick={startGemCapture} data-track="start-capture">🖥️ 화면 공유 시작</button>
        {:else}
          <button onclick={stopGemCapture}>🖥️ 화면 공유 종료</button>
        {/if}
        <button class:active={isDebugging} onclick={toggleDrawDebug}>
          🔨 공유 중인 화면 {isDebugging ? '끄기' : '보기'}
        </button>
      </div>
      <div class="right"></div>
    </div>
    <div hidden={!isDebugging}>
      <div class="debug-screen">
        <div class="threshold-controller">
          <input
            id="slider"
            type="range"
            min="0"
            max="2"
            step="1"
            bind:value={detectionMargin}
            oninput={async () => {
              await updateControllerDetectionMargin(detectionMargin / 10);
            }}
          />
          <label for="slider">허용 오차 범위: {StringDetectionMargin[detectionMargin]}</label>
        </div>
        <canvas bind:this={debugCanvas} style="border: 1px black solid;"></canvas>
      </div>
    </div>
    <div class="dual-panel">
      <div class="guide">
        <div class="title">
          <span>🎓️ 가이드</span>
          <button class="fold-button" onclick={() => toggleUI('showGemRecognitionGuide')}
            >{appConfig.current.uiConfig.showGemRecognitionGuide ? '▲' : '▼'}</button
          >
        </div>
        {#if appConfig.current.uiConfig.showGemRecognitionGuide}
          <div class="content">
            <p>
              1. 게임에서 젬 목록 화면을 연 뒤 모든 젬을 장착 해제해주세요.<br />
              안 쓰는 아크 그리드 프리셋으로 전환하는 것으로 손쉽게 젬을 해제할 수 있습니다.
            </p>
            <p>2. [🖥️ 화면 공유 시작] 버튼을 통해 로스트아크 게임 화면을 공유해주세요</p>
            <img src={guideImages['../assets/guide/2.png']} alt="guide-img2" />
            <p>
              2. 마우스가 젬을 건드리지 않도록 스크롤바 위에 위치시키는 것을 추천드립니다. 스크롤을
              내리면서 인식된 젬이 목록에 추가되는 것을 확인해주세요.
            </p>
            <p>
              3. 수집된 젬의 개수를 확인하고, <b>질서와 혼돈 모든 젬</b>이 수집되었으면 [✅ 현재
              프로필에 반영] 버튼을 눌러 프로필에 저장해주세요.
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
                젬 옵션을 추출하는 영역이 실제 위치와 일치하지 않는다면 게임 해상도를 "1920x1080
                (16:9)"로 화면을 "창 모드"로 변경해주세요.
              </li>
              <li>
                젬 옵션을 추출하는 영역 중 일부가 빨갛게 되어 있다면 상단 '허용 오차 범위'
                슬라이더를 높혀서 시도해주세요.
              </li>
              <br />
            </ol>
          </div>
        {/if}
      </div>
      <GemRecognitionGemList
        gems={{
          orderGems: totalOrderGems,
          chaosGems: totalChaosGems,
        }}
        bind:this={gemListElem}
      />
    </div>
  </div>
</div>

<style>
  /* 오버레이 + 중앙 정렬 */
  .panel {
    position: relative;
  }
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    vertical-align: middle;
  }
  .status-dot.online {
    background-color: #22c55e; /* 녹색 */
  }
  .status-dot.offline {
    background-color: #9ca3af; /* 회색 */
  }

  .fold-button {
    flex: 1;
    text-align: right;
    border: none;
    background: none;
  }

  .panel > .title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .panel > .title > .title-with-dot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .panel > .content {
    /* 내부 요소들은 상하 정렬 */
    display: flex;
    flex-direction: column;

    /* panel 내부 요소들 사이의 상하 간격 */
    gap: 0.7rem;
    overflow-y: hidden;
  }
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
  .guide img {
    max-width: 100%;
    height: auto;
    display: block;
  }
  .content > .buttons {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .buttons > div {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  .debug-screen {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
  }
  .debug-screen > canvas {
    width: auto;
  }
  .debug-screen > .threshold-controller {
    display: flex;
    /* height: 60px; */
    align-items: center;
    gap: 1rem;
  }
  .debug-screen > .threshold-controller > label {
    width: 20rem;
  }
  .debug-screen > .threshold-controller > input {
    transform: translateY(2px);
  }
</style>
