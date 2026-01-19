<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import {
    type ArkGridAttr,
    ArkGridAttrs,
    type ScrollCommand,
  } from '../lib/constants/enums';
  import {
    type ArkGridGem,
    type ArkGridGemOptionType,
    ArkGridGemOptionTypes,
    isSameArkGridGem,
  } from '../lib/models/arkGridGems';
  import { addGem, clearGems } from '../lib/state/profile.state.svelte';
  import ArkGridGemList from './ArkGridGemList.svelte';

  const OPENCV_URL =
    'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.12.0-release.1/dist/opencv.min.js';

  let cv: any;
  let debugCanvas: HTMLCanvasElement;
  let debugCtx: CanvasRenderingContext2D;
  let totalOrderGems = $state<ArkGridGem[]>([]);
  let totalChaosGems = $state<ArkGridGem[]>([]);
  let isRecording = $state<boolean>(false);
  let isDebugging = $state<boolean>(false);
  let isLoading = $state<boolean>(false);
  let scrollOrderGems: ScrollCommand = $state(null);
  let scrollChaosGems: ScrollCommand = $state(null);

  onMount(() => {
    const ctx = debugCanvas.getContext('2d');
    if (!ctx) throw Error;
    debugCtx = ctx;
  });

  interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  async function loadOpenCV() {
    if ((window as any).cv) {
      cv = (window as any).cv;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = OPENCV_URL;
      script.async = true;

      script.onload = async () => {
        await (window as any).cv.ready;
        cv = (window as any).cv;
        cv.onRuntimeInitialized = () => {
          // https://stackoverflow.com/questions/56671436/cv-mat-is-not-a-constructor-opencv
          resolve();
        };
      };

      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function loadAsset(name: string) {
    // 주어진 이름의 어셋을 읽고 grayscale로 변환한 뒤 cv.Mat으로 반환한다.
    const img = await createImageBitmap(
      await fetch(`src/assets/opencv/${name}.png`).then((r) => r.blob())
    );
    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const c = off.getContext('2d');
    if (!c) throw Error();
    c.drawImage(img, 0, 0);
    const data = c.getImageData(0, 0, img.width, img.height);
    const mat = cv.matFromImageData(data);
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
    img.close();
    return mat;
  }

  function debugRectJS(
    rect: Rect,
    color = 'red',
    lineWidth = 1,
    key: any = null,
    score: number | null = null
  ) {
    // 디버깅용
    // Rect영역을 color로 표시하고,
    // 탐지된 key와 score를 표시합니다.
    debugCtx.strokeStyle = color;
    debugCtx.lineWidth = lineWidth;
    debugCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    if (key && score !== null) {
      debugCtx.font = '14px 굴림'; // 폰트 설정
      debugCtx.fillStyle = color; // 색 지정
      debugCtx.textBaseline = 'top'; // y 기준을 rect.y로 맞춤
      debugCtx.fillText(key, rect.x, rect.y); // 조금 위로 올려 표시

      debugCtx.font = '12px 굴림'; // 폰트 설정
      debugCtx.fillText(score.toFixed(2), rect.x, rect.y + 14); // 조금 위로 올려 표시
    }
  }
  type CvMat = any;
  type TemplateMap<T extends string> = Record<T, CvMat>;
  function findBestMatch<T extends string>(
    frame: CvMat,
    rect: Rect,
    templates: TemplateMap<T>,
    threshold = 0.85
  ): T | null {
    // 주어진 templates map에서 가장 유사한 걸 찾아서 key를 반환합니다.
    // threshold를 넘지 못했을 경우 null을 반환합니다.
    if (
      rect.x < 0 ||
      rect.x + rect.w > frame.cols ||
      rect.y < 0 ||
      rect.y + rect.h > frame.rows
    )
      return null;
    const roi = frame.roi(new cv.Rect(rect.x, rect.y, rect.w, rect.h));
    let bestKey: T | null = null;
    let bestScore = 0;

    for (const [key, templateMat] of Object.entries(templates) as [
      T,
      CvMat,
    ][]) {
      const result = new cv.Mat();
      cv.matchTemplate(roi, templateMat, result, cv.TM_CCOEFF_NORMED);
      const { maxVal } = cv.minMaxLoc(result);
      if (maxVal > bestScore) {
        bestScore = maxVal;
        bestKey = key;
      }
      result.delete();
    }
    roi.delete();

    if (bestKey !== null && bestScore >= threshold) {
      // TODO 1위가 2위와 비슷하다면 null 처리
      if (isDebugging) debugRectJS(rect, 'green', 1, bestKey, bestScore);
      return bestKey;
    } else {
      if (isDebugging) debugRectJS(rect, 'red', 1, bestKey, bestScore);
    }
    return null;
  }
  /* ===============================
        5️⃣ 화면 공유 시작
    =============================== */
  interface CaptureController {
    startCapture(): Promise<void>;
    stopCapture(): Promise<void>;
    dispose(): Promise<void>;
  }
  const captureController: CaptureController = createCaptureController();

  function createCaptureController() {
    // type 선언
    type MatNumeric = Record<
      '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9',
      CvMat
    >;
    type MatOptionString = Record<ArkGridGemOptionType, CvMat>;
    type MatOptionValue = Record<'1' | '2' | '3' | '4' | '5', CvMat>;
    type MatGemAttr = Record<ArkGridAttr, CvMat>;
    interface LoadedAsset {
      matAnchor: CvMat;
      matNumeric: MatNumeric;
      matOptionString: MatOptionString;
      matOptionValue: MatOptionValue;
      matGemAttr: MatGemAttr;
    }

    // TODO 현재 component의 isLoading, isRecording state와 강하게 결합되어 있음
    let reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
    let track: MediaStreamTrack | null = null;
    let processor: MediaStreamTrackProcessor | null = null;
    let loadedAsset: LoadedAsset | null = null;

    // 분석용 canvas, DOM엔 연결하지 않음
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 0;
    canvas.height = 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function preloadAsset() {
      if (loadedAsset !== null) {
        // console.log('어셋이 이미 로드되어 있어 생략합니다.');
        return loadedAsset;
      }

      // console.log('어셋 로드 시작');
      isLoading = true;
      await loadOpenCV();
      const matAnchor = await loadAsset('anchor');
      const matNumeric: MatNumeric = {
        '1': await loadAsset('1'),
        '2': await loadAsset('2'),
        '3': await loadAsset('3'),
        '4': await loadAsset('4'),
        '5': await loadAsset('5'),
        '6': await loadAsset('6'),
        '7': await loadAsset('7'),
        '8': await loadAsset('8'),
        '9': await loadAsset('9'),
      };
      const matOptionString: MatOptionString = {
        [ArkGridGemOptionTypes.ATTACK]: await loadAsset('공격력'),
        [ArkGridGemOptionTypes.SKILL_DAMAGE]: await loadAsset('추가피해'),
        [ArkGridGemOptionTypes.BOSS_DAMAGE]: await loadAsset('보스피해'),
        [ArkGridGemOptionTypes.STIGMA]: await loadAsset('낙인력'),
        [ArkGridGemOptionTypes.PARTY_ATTACK]: await loadAsset('아군공격강화'),
        [ArkGridGemOptionTypes.PARTY_DAMAGE]: await loadAsset('아군피해강화'),
      };
      const matOptionValue: MatOptionValue = {
        '1': await loadAsset('lv1'),
        '2': await loadAsset('lv2'),
        '3': await loadAsset('lv3'),
        '4': await loadAsset('lv4'),
        '5': await loadAsset('lv5'),
      };
      const matGemAttr: MatGemAttr = {
        [ArkGridAttrs.Order]: await loadAsset('질서'),
        [ArkGridAttrs.Chaos]: await loadAsset('혼돈'),
      };
      isLoading = false;
      loadedAsset = {
        matAnchor,
        matNumeric,
        matOptionString,
        matOptionValue,
        matGemAttr,
      };

      // console.log('어셋 로드 완료');
      return loadedAsset;
    }
    async function startCapture() {
      // OpenCV와 어셋 로딩 promise 생성
      // TODO openCV는 중복해서 로드되지 않으나, 나머지 asset들은 공유 시작할 때마다 로드됨
      const preloadPromise = preloadAsset();
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 5 },
          audio: false,
        });
      } catch (err: any) {
        window.alert('화면 공유를 거부하였습니다.');
        console.error(err);
        return;
      }
      if (!stream) {
        window.alert('화면 공유에 실패하였습니다.');
        return;
      }
      const {
        matAnchor,
        matNumeric,
        matOptionString,
        matOptionValue,
        matGemAttr,
      } = await preloadPromise;

      // TrackProcessor 생성
      track = stream.getVideoTracks()[0];
      processor = new MediaStreamTrackProcessor({ track });
      reader = processor.readable.getReader();

      // 데이터 초기화
      totalOrderGems.length = 0;
      totalChaosGems.length = 0;
      const currentGems: ArkGridGem[] = [];
      isRecording = true;

      async function loop() {
        while (isRecording) {
          if (!reader) break;
          const { value: rawFrame, done } = await reader.read();
          // TODO throttling

          if (done) {
            // 종료
            break;
          }
          if (canvas.width === 0) {
            canvas.width = rawFrame.displayWidth;
            canvas.height = rawFrame.displayHeight;
            debugCanvas.width = canvas.width;
            debugCanvas.height = canvas.height;
          }
          if (isDebugging) {
            debugCtx.drawImage(
              rawFrame,
              0,
              0,
              debugCanvas.width,
              debugCanvas.height
            );
          }
          if (!ctx) break;
          ctx.drawImage(rawFrame, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const frame = cv.matFromImageData(imgData);
          cv.cvtColor(frame, frame, cv.COLOR_RGBA2GRAY);

          // 🔍 anchor 찾기
          const result = new cv.Mat();
          cv.matchTemplate(frame, matAnchor, result, cv.TM_CCOEFF_NORMED);
          const mm = cv.minMaxLoc(result);

          if (mm.maxVal > 0.9) {
            // TODO threshold 조절 가능하게

            currentGems.length = 0;
            const anchorX = mm.maxLoc.x;
            const anchorY = mm.maxLoc.y;

            // anchor 위치 표시
            if (isDebugging) {
              debugRectJS(
                {
                  x: anchorX,
                  y: anchorY,
                  w: matAnchor.cols,
                  h: matAnchor.rows,
                },
                'white'
              );
            }
            // 질서 혹은 혼돈 판단
            const gemAttrRect = {
              x: anchorX,
              y: anchorY + 210 - 118,
              w: 1613 - 1166,
              h: 233 - 210,
            };
            const gemAttr = findBestMatch(frame, gemAttrRect, matGemAttr);
            if (gemAttr === null) continue;
            let totalGems =
              gemAttr == ArkGridAttrs.Order ? totalOrderGems : totalChaosGems;

            // 9개의 젬을 찾아서 이미지 매칭
            for (let i = 0; i < 9; i++) {
              const rowRect: Rect = {
                x: anchorX + (1176 - 1166),
                y: anchorY + (331 - 118) + (394 - 331) * i,
                w: 1586 - 1176, // 410
                h: 391 - 331, // 60
              };

              const willPowerRect = {
                x: rowRect.x + (1240 - 1176),
                y: rowRect.y,
                w: 1264 - 1240,
                h: 30,
              };
              const willPower = findBestMatch(frame, willPowerRect, matNumeric);

              const corePointRect = {
                x: willPowerRect.x,
                y: willPowerRect.y + willPowerRect.h,
                w: willPowerRect.w,
                h: willPowerRect.h,
              };
              const corePoint = findBestMatch(frame, corePointRect, matNumeric);

              const optionARect = {
                x: rowRect.x + 1301 - 1176,
                y: willPowerRect.y,
                w: 1447 - 1301,
                h: willPowerRect.h,
              };
              const optionAValueRect = {
                x: optionARect.x + 40,
                y: optionARect.y,
                w: 1447 - 1301 - 40,
                h: optionARect.h,
              };
              const optionAType = findBestMatch(
                frame,
                optionARect,
                matOptionString
              );
              const optionAValue = findBestMatch(
                frame,
                optionAValueRect,
                matOptionValue
              );

              const optionBRect = {
                x: optionARect.x,
                y: willPowerRect.y + willPowerRect.h,
                w: optionARect.w,
                h: optionARect.h,
              };
              const optionBValueRect = {
                x: optionBRect.x + 40,
                y: optionBRect.y,
                w: 1447 - 1301 - 40,
                h: optionBRect.h,
              };
              const optionBType = findBestMatch(
                frame,
                optionBRect,
                matOptionString
              );
              const optionBValue = findBestMatch(
                frame,
                optionBValueRect,
                matOptionValue
              );

              // 제대로 인식이 됐는지 확인
              if (
                gemAttr === null ||
                corePoint === null ||
                willPower === null ||
                optionAType === null ||
                optionBType === null ||
                optionAValue === null ||
                optionBValue === null
              ) {
                // malformed한 젬이 하나라도 있으면 현재 화면은 버림
                if (!isDebugging) {
                  // debugging 중이 아니라면 남은 row를 볼 필요 없으니 break
                  // 맞다면 초록색 박스를 보여주기 위해 마저 수행
                  break;
                }
              } else {
                currentGems.push({
                  gemAttr: gemAttr,
                  req: Number(willPower),
                  point: Number(corePoint),
                  option1: {
                    optionType: optionAType,
                    value: Number(optionAValue),
                  },
                  option2: {
                    optionType: optionBType,
                    value: Number(optionBValue),
                  },
                });
              }
            }

            // 이제 currentGems는 현재 화면에 올바르게 인식된 젬들만 존재

            // 젬 추가
            const SAME_COUNT_THRESHOLD = 4;
            if (totalGems.length == 0 && currentGems.length > 0) {
              // 현재 젬이 없다면 화면에 있는 젬으로 갈아치움
              // 이땐 개수가 꼭 9개가 아니어도 됨 (애초에 젬을 적게 깎은 사람들)
              for (const gem of currentGems) {
                totalGems.push(gem);
              }
              if (gemAttr == ArkGridAttrs.Order)
                scrollOrderGems = { type: 'bottom', tick: Date.now() };
              if (gemAttr == ArkGridAttrs.Chaos)
                scrollChaosGems = { type: 'bottom', tick: Date.now() };
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
                    if (
                      isSameArkGridGem(
                        totalGems[foundIndex + i],
                        currentGems[i]
                      )
                    ) {
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
                      console.log('추가:', currentGems[i]);
                      if (gemAttr == ArkGridAttrs.Order)
                        scrollOrderGems = { type: 'bottom', tick: Date.now() };
                      if (gemAttr == ArkGridAttrs.Chaos)
                        scrollChaosGems = { type: 'bottom', tick: Date.now() };
                    }
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
                      if (
                        isSameArkGridGem(
                          totalGems[foundIndex - i],
                          currentGems[8 - i]
                        )
                      ) {
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
                        if (gemAttr == ArkGridAttrs.Order)
                          scrollOrderGems = { type: 'top', tick: Date.now() };
                        if (gemAttr == ArkGridAttrs.Chaos)
                          scrollChaosGems = { type: 'top', tick: Date.now() };
                        console.log('추가:', currentGems[i]);
                      }
                      // console.log($state.snapshot(totalGems));
                    }
                  }
                }
              }
            }
          } else {
            // anchor not found
            // console.log(mm.maxVal);
          }

          // 매 frame마다 메모리 정리
          frame.delete();
          result.delete();
          rawFrame.close();
        }

        // loop 종료 후
        debugCanvas.width = 0;
        debugCanvas.height = 0;
        canvas.width = 0;
        canvas.height = 0;
        isRecording = false;
        isDebugging = false;
        stream?.getVideoTracks().forEach((track) => track.stop());
        await reader?.cancel();
        reader?.releaseLock();
        track?.stop();
        reader = processor = track = null;
      }
      loop();
    }

    async function stopCapture() {
      isRecording = false;
    }

    async function dispose() {
      if (loadedAsset === null) {
        return;
      }
      const {
        matAnchor,
        matNumeric,
        matOptionString,
        matOptionValue,
        matGemAttr,
      } = loadedAsset;

      try {
        matAnchor.delete();
        const matGroups: Record<string, CvMat>[] = [
          matGemAttr,
          matNumeric,
          matOptionString,
          matOptionValue,
        ];
        for (const matTarget of matGroups) {
          for (const key in matTarget) {
            matTarget[key].delete();
          }
        }
      } catch {}
      loadedAsset = null;
    }

    return { startCapture, stopCapture, dispose };
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      // HMR로 모듈 교체 전 cleanup
      captureController.dispose?.();
    });
  }
  function applyGemList(gemAttr: ArkGridAttr, gems: ArkGridGem[]) {
    // 현재 수집한 젬을 현재 프로필에 덮어 씌우기
    if (gems.length > 0) {
      clearGems(gemAttr);
      for (const gem of gems) {
        addGem(gem);
      }
    }
  }
  const gemPanels = $derived([
    {
      title: '질서',
      attr: ArkGridAttrs.Order,
      gems: totalOrderGems,
      scrollCommand: scrollOrderGems,
    },
    {
      title: '혼돈',
      attr: ArkGridAttrs.Chaos,
      gems: totalChaosGems,
      scrollCommand: scrollChaosGems,
    },
  ]);

  onDestroy(async () => {
    await captureController.dispose();
  });
</script>

<div class="panel">
  {#if isLoading}
    <div class="overlay">
      <div class="spinner"></div>
    </div>
  {/if}
  <div class="title">
    <span>젬 화면 인식</span>
    <div
      class="status-dot"
      class:online={isRecording}
      class:offline={!isRecording}
    ></div>
  </div>
  <div>
    {#if !isRecording}
      <button onclick={captureController.startCapture}>🖥️ 화면 공유 시작</button
      >
    {:else}
      <button onclick={captureController.stopCapture}>🖥️ 화면 공유 종료</button>
    {/if}
    <button hidden onclick={captureController.dispose}>자원 정리</button>
    <button
      class:active={isDebugging}
      onclick={() => (isDebugging = !isDebugging)}
      disabled={!isRecording}
    >
      공유 중인 화면 {isDebugging ? '끄기' : '보기'}
    </button>
  </div>
  <div hidden={!isDebugging}>
    <canvas
      class="debugView"
      bind:this={debugCanvas}
      style="border: 1px black solid;"
    ></canvas>
  </div>
  <div class="guide">
    <p class="title">🎓️ 가이드</p>
    <img src="/src/assets/guide/1.png" alt="guide-img1" />
    <p>1. 로스트아크 해상도가 1920x1080 (16:9)인지 확인해주세요.</p>
    <p>
      2. 모니터의 해상도가 1920x1080인 경우에는 화면을 "전체 화면" 혹은 "전체 창
      모드"로 설정해주세요.<br />더 높은 해상도의 모니터인 경우 화면을 "창
      모드"로 설정해주세요.
    </p>
    <img src="/src/assets/guide/2.png" alt="guide-img2" />
    <p>
      3. 모든 젬을 장착 해제하고, [🖥️ 화면 공유 시작] 버튼을 통해 로스트아크
      화면을 공유해주세요
    </p>
    <p>
      4. 게임에서 젬 목록 화면을 연 뒤, 마우스가 젬을 가리지 않도록 스크롤바
      위에 위치시키세요.<br />스크롤을 천천히 내리면서 젬이 아래에 추가되는지
      확인해주세요.
    </p>
    <p>
      5. 수집된 젬의 개수를 확인하고, 모든 젬이 수집되었으면 [✅ 반영] 버튼을
      눌러 현재 프로필에 반영해주세요.
    </p>
  </div>
  <div class="dual-panel">
    {#each gemPanels as panel}
      <div class="detected-gems">
        <div class="title">{panel.title}의 젬</div>
        <div class="gem-list">
          <ArkGridGemList
            gems={panel.gems}
            showDeleteButton={false}
            emptyDescription=""
            scrollCommand={panel.scrollCommand}
          />
        </div>
        <div class="buttons">
          <div>{panel.gems.length > 0 ? `${panel.gems.length}개` : ''}</div>
          <button
            onclick={() => applyGemList(panel.attr, panel.gems)}
            disabled={panel.gems.length == 0}
          >
            반영
          </button>
          <button
            hidden
            onclick={() => {
              panel.gems.length = 0;
            }}>초기화</button
          >
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  /* 오버레이 + 중앙 정렬 */
  .panel {
    position: relative;
  }
  .overlay {
    /* backdrop-filter: blur(1px); */
  }
  .debugView {
    width: 100%;
    height: auto;
  }
  .dual-panel {
    gap: var(--global-gap);
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
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

  .panel > .guide {
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 0.4rem;
    background-color: #fafafa;
    padding: 1rem;
    width: 100%;
    align-self: center;
    box-sizing: border-box;
  }
  .panel > .guide > .title {
    font-weight: 700;
    font-size: 1.4rem;
  }

  .detected-gems {
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 0.4rem;
    margin-top: 1rem; /* 위에랑 조금 띄우기 */

    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }
  .detected-gems > .title {
    font-weight: 500;
    font-size: 1.2rem;
    align-self: center;
  }
  .detected-gems > .gem-list {
    display: flex;
    height: 27rem;
  }
  .detected-gems > .buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: right;
    align-items: center;
  }
  .detected-gems > .buttons button {
    /* 너비는 자동이지만 최소 5em */
    width: auto;
    min-width: 5em;

    /* panel 내부에서 우측 정렬 */
    align-self: center;
  }
</style>
