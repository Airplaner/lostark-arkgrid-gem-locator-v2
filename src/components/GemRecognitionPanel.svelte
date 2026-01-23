<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { type ArkGridAttr, ArkGridAttrs } from '../lib/constants/enums';
  import {
    type ArkGridGem,
    type ArkGridGemOptionType,
    ArkGridGemOptionTypes,
    determineGemGrade,
    isSameArkGridGem,
  } from '../lib/models/arkGridGems';
  import { appConfig, toggleUI } from '../lib/state/appConfig.state.svelte';
  import GemRecognitionGemList from './GemRecognitionGemList.svelte';

  const OPENCV_URL =
    'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.12.0-release.1/dist/opencv.min.js';
  const guideImages = import.meta.glob<string>('../assets/guide/*.png', {
    eager: true,
    import: 'default',
  });
  let cv: any;
  let debugCanvas: HTMLCanvasElement;
  let debugCtx: CanvasRenderingContext2D;
  let totalOrderGems = $state<ArkGridGem[]>([]);
  let totalChaosGems = $state<ArkGridGem[]>([]);
  let isRecording = $state<boolean>(false);
  let isDebugging = $state<boolean>(false);
  let isLoading = $state<boolean>(false);
  let gemListElem: GemRecognitionGemList | null = null;

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
    const url = `${import.meta.env.BASE_URL}/opencv/${name}.png`;
    const img = await createImageBitmap(await fetch(url).then((r) => r.blob()));
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
    type MatGemImage = Record<string, CvMat>;
    interface LoadedAsset {
      matAnchor: CvMat;
      matNumeric: MatNumeric;
      matOptionString: MatOptionString;
      matOptionValue: MatOptionValue;
      matGemAttr: MatGemAttr;
      matGemImage: MatGemImage;
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
        return loadedAsset;
      }

      isLoading = true;
      await loadOpenCV();

      // 1. Anchor
      const matAnchorPromise = loadAsset('anchor');

      // 2. 숫자 어셋
      const numericKeys = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
      ] as const;
      const matNumericPromises = numericKeys.map((key) => loadAsset(key));

      // 3. 옵션 문자열
      const optionKeys = [
        ArkGridGemOptionTypes.ATTACK,
        ArkGridGemOptionTypes.SKILL_DAMAGE,
        ArkGridGemOptionTypes.BOSS_DAMAGE,
        ArkGridGemOptionTypes.STIGMA,
        ArkGridGemOptionTypes.PARTY_ATTACK,
        ArkGridGemOptionTypes.PARTY_DAMAGE,
      ] as const;
      const optionNames = [
        '공격력',
        '추가피해',
        '보스피해',
        '낙인력',
        '아군공격강화',
        '아군피해강화',
      ];
      const matOptionStringPromises = optionNames.map((name) =>
        loadAsset(name)
      );

      // 4. 옵션 값
      const optionValueKeys = ['1', '2', '3', '4', '5'] as const;
      const optionValueNames = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5'];
      const matOptionValuePromises = optionValueNames.map((name) =>
        loadAsset(name)
      );

      // 5. 젬 속성
      const gemAttrKeys = [ArkGridAttrs.Order, ArkGridAttrs.Chaos] as const;
      const gemAttrNames = ['질서', '혼돈'];
      const matGemAttrPromises = gemAttrNames.map((name) => loadAsset(name));

      // 6. 젬 문양
      const gemImageKeys = [
        '질서의 젬 : 안정',
        '질서의 젬 : 견고',
        '질서의 젬 : 불변',
        '혼돈의 젬 : 침식',
        '혼돈의 젬 : 왜곡',
        '혼돈의 젬 : 붕괴',
      ];
      const gemImageNames = ['안정', '견고', '불변', '침식', '왜곡', '붕괴'];
      const matGemImagePromises = gemImageNames.map((name) => loadAsset(name));

      // 모든 Promise를 병렬로 실행
      const [
        matAnchor,
        matNumericResults,
        matOptionStringResults,
        matOptionValueResults,
        matGemAttrResults,
        matGemImageResults,
      ] = await Promise.all([
        matAnchorPromise,
        Promise.all(matNumericPromises),
        Promise.all(matOptionStringPromises),
        Promise.all(matOptionValuePromises),
        Promise.all(matGemAttrPromises),
        Promise.all(matGemImagePromises),
      ]);

      // 결과를 객체로 재조립
      const matNumeric: MatNumeric = Object.fromEntries(
        numericKeys.map((key, i) => [key, matNumericResults[i]])
      );

      const matOptionString: MatOptionString = Object.fromEntries(
        optionKeys.map((key, i) => [key, matOptionStringResults[i]])
      );

      const matOptionValue: MatOptionValue = Object.fromEntries(
        optionValueKeys.map((key, i) => [key, matOptionValueResults[i]])
      );

      const matGemAttr: MatGemAttr = Object.fromEntries(
        gemAttrKeys.map((key, i) => [key, matGemAttrResults[i]])
      );

      const matGemImage: MatGemImage = Object.fromEntries(
        gemImageKeys.map((key, i) => [key, matGemImageResults[i]])
      );

      isLoading = false;
      loadedAsset = {
        matAnchor,
        matNumeric,
        matOptionString,
        matOptionValue,
        matGemAttr,
        matGemImage,
      };

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
        matGemImage,
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
              const gemImageRect = {
                x: rowRect.x + 1198 - 1176,
                y: rowRect.y + 347 - 331,
                w: 1212 - 1198,
                h: 375 - 347,
              };
              const gemName = findBestMatch(frame, gemImageRect, matGemImage);

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
                gemName === null ||
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
                const gem: ArkGridGem = {
                  name: gemName,
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
                };
                gem.grade = determineGemGrade(
                  gem.req,
                  gem.point,
                  gem.option1,
                  gem.option2,
                  gem.name
                );
                currentGems.push(gem);
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
                    }
                    gemListElem?.selectTab(
                      gemAttr == ArkGridAttrs.Order ? 0 : 1
                    );
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
                        console.log('추가:', currentGems[i]);
                      }
                      gemListElem?.selectTab(
                        gemAttr == ArkGridAttrs.Order ? 0 : 1
                      );
                      gemListElem?.scroll('top');
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
    <div class="title-with-dot">
      <span>젬 화면 인식</span>
      <div
        class="status-dot"
        class:online={isRecording}
        class:offline={!isRecording}
      ></div>
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
    style:display={!appConfig.current.uiConfig.showGemRecognitionPanel
      ? 'none'
      : 'flex'}
  >
    <div>
      {#if !isRecording}
        <button onclick={captureController.startCapture}
          >🖥️ 화면 공유 시작</button
        >
      {:else}
        <button onclick={captureController.stopCapture}
          >🖥️ 화면 공유 종료</button
        >
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
    <div class="dual-panel">
      <div class="guide">
        <div class="title">
          <span>🎓️ 가이드</span>
          <button
            class="fold-button"
            onclick={() => toggleUI('showGemRecognitionGuide')}
            >{appConfig.current.uiConfig.showGemRecognitionGuide
              ? '▲'
              : '▼'}</button
          >
        </div>
        {#if appConfig.current.uiConfig.showGemRecognitionGuide}
          <div class="content">
            <p>
              1. 모니터의 해상도가 <b>FHD (1920x1080)</b>이거나
              <b>WFHD (2560x1980)</b>인 경우 그대로 진행해주세요.<br />
              모니터의 해상도가 그 이상인 경우, 화면 인식을 위해 반드시 로스트아크
              해상도를 <b>"1920x1080 (16:9)"</b>으로 설정한 뒤 화면을 "창
              모드"로 설정해주세요.
            </p>

            <img src={guideImages['../assets/guide/1.png']} alt="guide-img1" />
            <p>
              3. 게임에서 젬 목록 화면을 연 뒤 모든 젬을 장착 해제하고, [🖥️ 화면
              공유 시작] 버튼을 통해 화면을 공유해주세요<br /> (안쓰는 아크 그리드
              프리셋으로 전환하는 것으로 손쉽게 젬을 해제할 수 있습니다.)
            </p>
            <img src={guideImages['../assets/guide/2.png']} alt="guide-img2" />
            <p>
              4. 마우스가 젬을 건드리지 않도록 스크롤바 위에 위치시키는 것을
              추천드립니다. 스크롤을 내리면서 인식된 젬이 목록에 추가되는 것을
              확인해주세요.
            </p>
            <p>
              5. 수집된 젬의 개수를 확인하고, <b>질서와 혼돈 모든 젬</b>이
              수집되었으면 [✅ 현재 프로필에 반영] 버튼을 눌러 프로필에
              저장해주세요.
            </p>
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
  .debugView {
    width: 100%;
    height: auto;
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
    background-color: #fafafa;
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
</style>
