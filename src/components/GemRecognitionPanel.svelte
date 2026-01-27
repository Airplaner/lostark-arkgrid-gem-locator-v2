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
  import { type EnUsTemplateName, enUsCoords } from '../lib/opencv-template-coords/en_us';
  import { type KoKrTemplateName, koKrCoords } from '../lib/opencv-template-coords/ko_kr';
  import {
    type AppLocale,
    appConfig,
    supportedLocales,
    toggleLocale,
    toggleUI,
  } from '../lib/state/appConfig.state.svelte';
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
  let detectionThreshold = $state<number>(0.85);
  let gemListElem: GemRecognitionGemList | null = null;

  onMount(() => {
    const ctx = debugCanvas.getContext('2d');
    if (!ctx) throw Error('debugCanvas에서 context 획득 실패');
    debugCtx = ctx;
  });

  type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
  };
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

  /**
   * 스프라이트 이미지를 한 번 fetch → cv.Mat 생성
   */
  async function fetchSpriteMat(url: string): Promise<CvMat> {
    const img = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('Canvas context creation failed');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    const mat = cv.matFromImageData(data);
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
    img.close();
    return mat;
  }

  /**
   * ROI로 CvMat 복사
   */
  function createRoi(mat: CvMat, rect: { x: number; y: number; w: number; h: number }): CvMat {
    const roi = mat.roi(new cv.Rect(rect.x, rect.y, rect.w, rect.h));
    return roi;
  }

  /**
   * 모든 언어별 템플릿 CvMat 로드
   */
  type GemTemplates = {
    ko_kr: Record<KoKrTemplateName, CvMat>;
    en_us: Record<EnUsTemplateName, CvMat>;
  };
  export async function loadGemTemplates(): Promise<GemTemplates> {
    const result = {
      ko_kr: {} as any,
      en_us: {} as any,
    };

    // 1️⃣ ko_kr 스프라이트 한 번만 fetch
    const koSprite = await fetchSpriteMat(`${import.meta.env.BASE_URL}/opencv_template_ko_kr.png`);
    for (const [name, rect] of Object.entries(koKrCoords)) {
      result.ko_kr[name] = createRoi(koSprite, rect);
    }
    // koSprite는 더 이상 필요 없으면 삭제 가능
    koSprite.delete();

    // 2️⃣ en_us 스프라이트 한 번만 fetch
    const enSprite = await fetchSpriteMat(`${import.meta.env.BASE_URL}/opencv_template_en_us.png`);
    for (const [name, rect] of Object.entries(enUsCoords)) {
      result.en_us[name] = createRoi(enSprite, rect);
    }
    enSprite.delete();

    return result;
  }

  function debugRectJS(
    rect: Rect,
    option?: {
      key?: string | null;
      score?: number | null;
      rectColor?: string;
      rectLineWidth?: number;
      fontColor?: string;
      fontSize?: number;
    }
  ) {
    // 디버깅용
    // Rect영역을 color로 표시하고,
    // 탐지된 key와 score를 표시합니다.
    const rectLineWidth = option?.rectLineWidth ?? 1;
    debugCtx.strokeStyle = option?.rectColor ?? 'white';
    debugCtx.lineWidth = rectLineWidth;
    debugCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    if (option?.key || option?.score) {
      const fontSize = option?.fontSize ?? 12;
      debugCtx.font = `${fontSize}px Arial`; // 폰트 설정
      debugCtx.fillStyle = option?.fontColor ?? 'white';
      debugCtx.textBaseline = 'top'; // y 기준을 rect.y로 맞춤
      if (option.key) debugCtx.fillText(option.key, rect.x + rectLineWidth, rect.y + rectLineWidth);
      if (option.score)
        debugCtx.fillText(
          option.score.toFixed(2),
          rect.x + rectLineWidth,
          rect.y + rectLineWidth + (option.key ? fontSize : 0)
        );
    }
  }
  type CvMat = any;
  type TemplateMap<T extends string> = Record<T, CvMat>;
  function findBestMatch<T extends string>(
    frame: CvMat,
    rect: Rect | null,
    templates: TemplateMap<T>,
    threshold = 0.85
  ): {
    bestKey: T;
    bestLoc: Rect;
  } | null {
    // 주어진 templates map에서 가장 유사한 걸 찾아서 key를 반환합니다.
    // threshold를 넘지 못했을 경우 null을 반환합니다.

    // 탐지 영역 rect가 주어진 경우 해당 부분만 수행, 아니라면 frame 전체
    let roi: CvMat = frame;
    let needDeleteRoi = false;

    if (rect) {
      if (
        rect.x < 0 ||
        rect.x + rect.w > frame.cols ||
        rect.y < 0 ||
        rect.y + rect.h > frame.rows
      ) {
        return null;
      }
      roi = frame.roi(new cv.Rect(rect.x, rect.y, rect.w, rect.h));
      needDeleteRoi = true;
    }

    let bestKey: T | null = null;
    let bestScore = 0;
    let bestMm: any = null;
    let bestTempate: CvMat | null = null;

    for (const [key, templateMat] of Object.entries(templates) as [T, CvMat][]) {
      const result = new cv.Mat();
      cv.matchTemplate(roi, templateMat, result, cv.TM_CCOEFF_NORMED);
      const mm = cv.minMaxLoc(result);
      if (mm.maxVal > bestScore) {
        bestScore = mm.maxVal;
        bestKey = key;
        bestMm = mm;
        bestTempate = templateMat;
      }
      result.delete();
    }
    if (needDeleteRoi) roi.delete();

    if (bestKey !== null && bestScore >= threshold) {
      // 가장 가까운 template가 정한 threshold보다 높다면, 정답을 찾음

      // TODO 1위가 2위와 비슷하다면 null 처리

      if (isDebugging) {
        if (rect) {
          // 검색 대상 영역(rect)가 있는 경우, 거기에 정보 표시
          // 정답 위치는 회색 네모로 표시
          debugRectJS(rect, {
            key: bestKey,
            score: bestScore,
            rectColor: 'green',
            fontColor: 'lightgray',
          });
          debugRectJS(
            {
              x: (rect ? rect.x : 0) + bestMm.maxLoc.x,
              y: (rect ? rect.y : 0) + bestMm.maxLoc.y,
              w: bestTempate.cols,
              h: bestTempate.rows,
            },
            { rectColor: 'gray' }
          );
        } else {
          // 전체 화면을 대상으로 검색한 경우, 정답 위치에 모두 표시
          debugRectJS(
            {
              x: bestMm.maxLoc.x,
              y: bestMm.maxLoc.y,
              w: bestTempate.cols,
              h: bestTempate.rows,
            },
            { key: bestKey, score: bestScore, rectColor: 'green' }
          );
        }
      }

      return {
        bestKey,
        bestLoc: {
          x: bestMm.maxLoc.x,
          y: bestMm.maxLoc.y,
          w: bestTempate.cols,
          h: bestTempate.rows,
        },
      };
    } else {
      // 정답을 못 찾은 경우
      if (isDebugging) {
        if (rect) {
          // 검색 대상 영역을 붉은 네모로 처리
          // 예상가는 영역을 굳이 보여줄 필욘 없을듯
          debugRectJS(rect, {
            key: bestKey,
            score: bestScore,
            rectColor: 'red',
            fontColor: 'gray',
          });
        } else {
          // rect도 없이 부를 일은 anchor 찾기용뿐이니 여기에서..
          debugRectJS(
            { x: frame.cols / 4, y: frame.rows / 4, w: frame.cols / 2, h: frame.rows / 2 },
            {
              key: '아크 그리드 젬 목록을 찾지 못하였습니다.',
              fontSize: 60,
              fontColor: 'red',
              rectColor: 'red',
              rectLineWidth: 10,
            }
          );
        }
      }
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
    type MatNumeric = Record<'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9', CvMat>;
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
    type GlobalLoadedAsset = Record<AppLocale, LoadedAsset>;
    // TODO 현재 component의 isLoading, isRecording state와 강하게 결합되어 있음
    let reader: ReadableStreamDefaultReader<VideoFrame> | null = null;
    let track: MediaStreamTrack | null = null;
    let processor: MediaStreamTrackProcessor | null = null;
    let globalLoadedAsset: GlobalLoadedAsset | null = null;

    // 분석용 canvas, DOM엔 연결하지 않음
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 0;
    canvas.height = 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function preloadAsset() {
      if (globalLoadedAsset !== null) {
        return globalLoadedAsset;
      }

      globalLoadedAsset = {} as GlobalLoadedAsset;
      isLoading = true;
      await loadOpenCV();

      const gt = await loadGemTemplates();
      for (const targetLocale of supportedLocales) {
        const mats = gt[targetLocale];

        const matAnchor = mats['anchor.png'];
        const matNumeric = {
          1: mats['1.png'],
          2: mats['2.png'],
          3: mats['3.png'],
          4: mats['4.png'],
          5: mats['5.png'],
          6: mats['6.png'],
          7: mats['7.png'],
          8: mats['8.png'],
          9: mats['9.png'],
        };
        const matOptionString = {
          [ArkGridGemOptionTypes.ATTACK]: mats['공격력.png'],
          [ArkGridGemOptionTypes.SKILL_DAMAGE]: mats['추가피해.png'],
          [ArkGridGemOptionTypes.BOSS_DAMAGE]: mats['보스피해.png'],
          [ArkGridGemOptionTypes.STIGMA]: mats['낙인력.png'],
          [ArkGridGemOptionTypes.PARTY_ATTACK]: mats['아군공격강화.png'],
          [ArkGridGemOptionTypes.PARTY_DAMAGE]: mats['아군피해강화.png'],
        };
        const matOptionValue = {
          1: mats['lv1.png'],
          2: mats['lv2.png'],
          3: mats['lv3.png'],
          4: mats['lv4.png'],
          5: mats['lv5.png'],
        };
        const matGemAttr = {
          [ArkGridAttrs.Order]: mats['질서.png'],
          [ArkGridAttrs.Chaos]: mats['혼돈.png'],
        };
        const matGemImage = {
          '질서의 젬 : 안정': mats['안정.png'],
          '질서의 젬 : 견고': mats['견고.png'],
          '질서의 젬 : 불변': mats['불변.png'],
          '혼돈의 젬 : 침식': mats['침식.png'],
          '혼돈의 젬 : 왜곡': mats['왜곡.png'],
          '혼돈의 젬 : 붕괴': mats['붕괴.png'],
        };

        isLoading = false;
        globalLoadedAsset[targetLocale] = {
          matAnchor,
          matNumeric,
          matOptionString,
          matOptionValue,
          matGemAttr,
          matGemImage,
        };
      }
      return globalLoadedAsset;
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
      await preloadPromise;
      if (!globalLoadedAsset) {
        window.alert('화면 인식에 필요한 데이터가 준비되지 않았습니다.');
        return;
      }

      // TrackProcessor 생성
      track = stream.getVideoTracks()[0];
      processor = new MediaStreamTrackProcessor({ track });
      reader = processor.readable.getReader();

      // 데이터 초기화
      totalOrderGems.length = 0;
      totalChaosGems.length = 0;
      const currentGems: ArkGridGem[] = [];
      isRecording = true;
      const allAnchorMats = {
        ko_kr: globalLoadedAsset['ko_kr'].matAnchor,
        en_us: globalLoadedAsset['en_us'].matAnchor,
      };

      async function loop() {
        while (isRecording) {
          if (!reader) break;
          const { value: rawFrame, done } = await reader.read();
          // TODO throttling

          if (done) {
            // 종료
            break;
          }
          // 1. 화면 인식에 사용할 캔버스 크기를 입력과 맞게 설정
          canvas.width = rawFrame.displayWidth;
          canvas.height = rawFrame.displayHeight;
          debugCanvas.width = canvas.width;
          debugCanvas.height = canvas.height;
          if (isDebugging) {
            debugCtx.drawImage(rawFrame, 0, 0, debugCanvas.width, debugCanvas.height);
          }
          if (!ctx) break;

          // 2. 입력을 canvas에 그린 뒤 gray scale로 변환
          ctx.drawImage(rawFrame, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const frame = cv.matFromImageData(imgData);
          cv.cvtColor(frame, frame, cv.COLOR_RGBA2GRAY);

          // 3. anchor 찾기
          if (!globalLoadedAsset) break;
          const findAnchor = findBestMatch(frame, null, allAnchorMats, detectionThreshold);
          if (!findAnchor) continue; // 못 찾으면 프레임 생략
          const anchorX = findAnchor.bestLoc.x;
          const anchorY = findAnchor.bestLoc.y;
          const currentLocale = findAnchor.bestKey;
          // 현재 화면에 인식된 젬 목록 reset
          currentGems.length = 0;

          // 4. 현재 젬 목록이 질서인지 혼돈인지 구분
          const gemAttrRect = {
            x: anchorX,
            y: anchorY + 210 - 118,
            w: 1613 - 1166,
            h: 233 - 210,
          };
          const gemAttr =
            findBestMatch(
              frame,
              gemAttrRect,
              globalLoadedAsset[currentLocale].matGemAttr,
              detectionThreshold
            )?.bestKey ?? null;
          if (!gemAttr) continue; // 구분이 안 가면 프레임 생략

          // 추가 대상 젬 목록 가져옴
          let totalGems = gemAttr == ArkGridAttrs.Order ? totalOrderGems : totalChaosGems;

          // 5. 9개의 젬을 찾아서 이미지 매칭
          for (let i = 0; i < 9; i++) {
            // 젬 row의 위치 계산 (높이 63픽셀)
            const rowRect: Rect = {
              x: anchorX + (1176 - 1166),
              y: anchorY + (331 - 118) + (394 - 331) * i,
              w: 1586 - 1176, // 410
              h: 391 - 331, // 60
            };

            // 5-1) 젬 이미지를 통해서 젬 종류 인식
            const gemImageRect = {
              x: rowRect.x + 1198 - 1176,
              y: rowRect.y + 347 - 331,
              w: 1212 - 1198,
              h: 375 - 347,
            };
            const gemName =
              findBestMatch(
                frame,
                gemImageRect,
                globalLoadedAsset[currentLocale].matGemImage,
                detectionThreshold
              )?.bestKey ?? null;

            // 5-2) 젬 의지력
            const willPowerRect = {
              x: rowRect.x + (1240 - 1176),
              y: rowRect.y,
              w: 1264 - 1240,
              h: 30,
            };
            const willPower =
              findBestMatch(
                frame,
                willPowerRect,
                globalLoadedAsset[currentLocale].matNumeric,
                detectionThreshold
              )?.bestKey ?? null;

            // 5-3) 젬 질서/혼돈 포인트
            const corePointRect = {
              x: willPowerRect.x,
              y: willPowerRect.y + willPowerRect.h,
              w: willPowerRect.w,
              h: willPowerRect.h,
            };
            const corePoint =
              findBestMatch(
                frame,
                corePointRect,
                globalLoadedAsset[currentLocale].matNumeric,
                detectionThreshold
              )?.bestKey ?? null;

            // 5-4) 첫 줄 옵션
            const optionARect = {
              x: rowRect.x + 1301 - 1176,
              y: willPowerRect.y,
              w: 1447 - 1301,
              h: willPowerRect.h,
            };
            const optionAMatch = findBestMatch(
              frame,
              optionARect,
              globalLoadedAsset[currentLocale].matOptionString,
              detectionThreshold
            );
            // 옵션을 찾았다면, 옵션의 너비만큼 거리를 벌려서 optionA의 레벨을 찾음
            const optionAType = optionAMatch?.bestKey ?? null;
            const optionALoc = optionAMatch?.bestLoc ?? null;
            const optionALevelXOffset = optionALoc ? optionALoc.x + optionALoc.w : 60;

            const optionAValueRect = {
              x: optionARect.x + optionALevelXOffset,
              y: optionARect.y,
              w: 1447 - 1301 - optionALevelXOffset,
              h: optionARect.h,
            };
            const optionAValue =
              findBestMatch(
                frame,
                optionAValueRect,
                globalLoadedAsset[currentLocale].matOptionValue,
                detectionThreshold
              )?.bestKey ?? null;

            // 5-5) 2번째 옵션
            const optionBRect = {
              x: optionARect.x,
              y: willPowerRect.y + willPowerRect.h,
              w: optionARect.w,
              h: optionARect.h,
            };
            const optionBMatch = findBestMatch(
              frame,
              optionBRect,
              globalLoadedAsset[currentLocale].matOptionString,
              detectionThreshold
            );
            const optionBType = optionBMatch?.bestKey ?? null;
            const optionBLoc = optionBMatch?.bestLoc ?? null;
            const optionBLevelXOffset = optionBLoc ? optionBLoc.x + optionBLoc.w : 60;
            const optionBValueRect = {
              x: optionBRect.x + optionBLevelXOffset,
              y: optionBRect.y,
              w: 1447 - 1301 - optionBLevelXOffset,
              h: optionBRect.h,
            };
            const optionBValue =
              findBestMatch(
                frame,
                optionBValueRect,
                globalLoadedAsset[currentLocale].matOptionValue,
                detectionThreshold
              )?.bestKey ?? null;
            console.log('');

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
                // debugging 중이 아니라면 남은 row를 볼 필요 없으니 break 후 프레임 버림
                // 맞다면 나머지 중 인식이 되고 안 된 부분을 보여주기 위해 진행
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
              gem.grade = determineGemGrade(gem.req, gem.point, gem.option1, gem.option2, gem.name);
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
          // 매 frame마다 메모리 정리
          frame.delete();
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
      isLoading = true;
      if (globalLoadedAsset === null) {
        isLoading = false;
        return;
      }
      for (const targetLocale of supportedLocales) {
        const { matAnchor, matNumeric, matOptionString, matOptionValue, matGemAttr } =
          globalLoadedAsset[targetLocale];

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
      }
      globalLoadedAsset = null;
      isLoading = false;
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
          <button onclick={captureController.startCapture} data-track="start-capture"
            >🖥️ 화면 공유 시작</button
          >
        {:else}
          <button onclick={captureController.stopCapture}>🖥️ 화면 공유 종료</button>
        {/if}
        <button
          class:active={isDebugging}
          onclick={() => (isDebugging = !isDebugging)}
          disabled={!isRecording}
        >
          공유 중인 화면 {isDebugging ? '끄기' : '보기'}
        </button>
      </div>
      <div class="right">
        <button hidden={!appConfig.current.uiConfig.debugMode} onclick={captureController.dispose}
          >자원 정리</button
        >
        <button
          hidden={!appConfig.current.uiConfig.debugMode}
          onclick={() => {
            if (appConfig.current.locale == 'ko_kr') {
              if (
                !window.confirm(
                  'Would you like to switch the screen recognition to the English client? ' +
                    'Even you enabled the feature, this site has not been translated into English. ' +
                    'Please use your browser’s translation feature.\n\n' +
                    '영문 클라이언트를 사용자를 위한 기능입니다. 화면 인식 기준을 영문 클라이언트로 전환하시겠습니까?'
                )
              ) {
                return;
              }
            }
            captureController.dispose();
            toggleLocale();
          }}
          disabled={isRecording}>Locale: {appConfig.current.locale}</button
        >
      </div>
    </div>
    <div hidden={!isDebugging}>
      <div class="debug-screen">
        <div class="threshold-controller">
          <label for="slider">화면 인식 정밀도 {detectionThreshold}</label>
          <input
            id="slider"
            type="range"
            min="0.5"
            max="0.85"
            step="0.05"
            bind:value={detectionThreshold}
          />
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
              1. 모니터의 해상도가 <b>FHD (1920x1080)</b>이거나
              <b>WFHD (2560x1980)</b>인 경우 그대로 진행해주세요.<br />
              모니터의 해상도가 그 이상인 경우, 화면 인식을 위해 반드시 로스트아크 해상도를
              <b>"1920x1080 (16:9)"</b>으로 설정한 뒤 화면을 "창 모드"로 설정해주세요.
            </p>

            <img src={guideImages['../assets/guide/1.png']} alt="guide-img1" />
            <p>
              3. 게임에서 젬 목록 화면을 연 뒤 모든 젬을 장착 해제하고, [🖥️ 화면 공유 시작] 버튼을
              통해 화면을 공유해주세요<br /> (안쓰는 아크 그리드 프리셋으로 전환하는 것으로 손쉽게 젬을
              해제할 수 있습니다.)
            </p>
            <img src={guideImages['../assets/guide/2.png']} alt="guide-img2" />
            <p>
              4. 마우스가 젬을 건드리지 않도록 스크롤바 위에 위치시키는 것을 추천드립니다. 스크롤을
              내리면서 인식된 젬이 목록에 추가되는 것을 확인해주세요.
            </p>
            <p>
              5. 수집된 젬의 개수를 확인하고, <b>질서와 혼돈 모든 젬</b>이 수집되었으면 [✅ 현재
              프로필에 반영] 버튼을 눌러 프로필에 저장해주세요.
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
    width: 9.5rem;
  }
  .debug-screen > .threshold-controller > input {
    transform: translateY(2px);
  }
</style>
