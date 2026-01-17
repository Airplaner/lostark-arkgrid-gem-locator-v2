<script lang="ts">
  import { onDestroy } from 'svelte';

  import { ArkGridAttrs } from '../lib/constants/enums';
  import {
    type ArkGridGem,
    ArkGridGemOptionTypes,
    isSameArkGridGem,
  } from '../lib/models/arkGridGems';

  /* ===============================
        1️⃣ 라이브러리 경로
    =============================== */
  const OPENCV_URL =
    'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.12.0-release.1/dist/opencv.min.js';

  let cv: any;
  let rafId: number | null = null;

  let video: HTMLVideoElement;
  let debugCanvas: HTMLCanvasElement;
  let debugCtx: CanvasRenderingContext2D;

  $: if (debugCanvas) {
    debugCtx = debugCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  /* ===============================
        2️⃣ OpenCV 로드
    =============================== */

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
        resolve();
      };

      script.onerror = reject;
      document.body.appendChild(script);
    });

    console.log('OpenCV 로드 완료');
  }

  async function loadAsset(name: string) {
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

  function debugRectJS(rect: Rect, color = 'red', lineWidth = 1) {
    debugCtx.strokeStyle = color;
    debugCtx.lineWidth = lineWidth;
    debugCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  /* ===============================
        5️⃣ 화면 공유 시작
    =============================== */
  async function startCapture() {
    await loadOpenCV();
    const matAnchor = await loadAsset('anchor');
    const matNumeric = {
      1: await loadAsset('1'),
      2: await loadAsset('2'),
      3: await loadAsset('3'),
      4: await loadAsset('4'),
      5: await loadAsset('5'),
      6: await loadAsset('6'),
      7: await loadAsset('7'),
      8: await loadAsset('8'),
      9: await loadAsset('9'),
    };
    const matOptionString = {
      [ArkGridGemOptionTypes.ATTACK]: await loadAsset('공격력'),
      [ArkGridGemOptionTypes.SKILL_DAMAGE]: await loadAsset('추가피해'),
      [ArkGridGemOptionTypes.BOSS_DAMAGE]: await loadAsset('보스피해'),
      [ArkGridGemOptionTypes.STIGMA]: await loadAsset('낙인력'),
      [ArkGridGemOptionTypes.PARTY_ATTACK]: await loadAsset('아군공격강화'),
      [ArkGridGemOptionTypes.PARTY_DAMAGE]: await loadAsset('아군피해강화'),
    };
    const matGemAttr = {
      [ArkGridAttrs.Order]: await loadAsset('질서'),
      [ArkGridAttrs.Chaos]: await loadAsset('혼돈'),
    };

    type CvMat = any;
    type TemplateMap<T extends string | number> = Record<T, CvMat>;
    function findBestMatch<T extends string | number>(
      frame: CvMat,
      rect: Rect,
      templates: TemplateMap<T>,
      threshold = 0.8
    ): T | null {
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
        return bestKey;
      } else {
        // console.log('cannot find!', bestScore, bestKey);
      }
      return null;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 10 },
      audio: false,
    });

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    });
    video.srcObject = stream;
    let currentGems: ArkGridGem[] = [];
    let totalGems: ArkGridGem[] = [];

    /* ===============================
        6️⃣ 메인 루프
    =============================== */
    async function loop() {
      if (!ctx) throw Error;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const frame = cv.matFromImageData(imgData);
      cv.cvtColor(frame, frame, cv.COLOR_RGBA2GRAY);

      // 🔍 anchor 찾기
      const result = new cv.Mat();
      cv.matchTemplate(frame, matAnchor, result, cv.TM_CCOEFF_NORMED);
      const mm = cv.minMaxLoc(result);

      if (mm.maxVal > 0.85) {
        // TODO threshold 조절 가능하게

        currentGems = [];
        const anchorX = mm.maxLoc.x;
        const anchorY = mm.maxLoc.y;

        // 질서 혹은 혼돈 판단
        const gemAttrRect = {
          x: anchorX,
          y: anchorY + 210 - 118,
          w: 1613 - 1166,
          h: 233 - 210,
        };
        debugRectJS(gemAttrRect);
        const gemAttr = findBestMatch(frame, gemAttrRect, matGemAttr);

        // 9개의 젬을 찾아서 이미지 매칭
        for (let i = 0; i < 9; i++) {
          const rowRect: Rect = {
            x: anchorX + (1176 - 1166),
            y: anchorY + (331 - 118) + (394 - 331) * i,
            w: 1586 - 1176, // 410
            h: 391 - 331, // 60
          };
          debugRectJS(rowRect);

          const willPowerRect = {
            x: rowRect.x + (1240 - 1176),
            y: rowRect.y,
            w: 1264 - 1240,
            h: 30,
          };

          debugRectJS(willPowerRect);
          const willPower = findBestMatch(frame, willPowerRect, matNumeric);

          const corePointRect = {
            x: willPowerRect.x,
            y: willPowerRect.y + willPowerRect.h,
            w: willPowerRect.w,
            h: willPowerRect.h,
          };
          debugRectJS(corePointRect);
          const corePoint = findBestMatch(frame, corePointRect, matNumeric);

          const optionARect = {
            x: rowRect.x + 1301 - 1176,
            y: willPowerRect.y,
            w: 1447 - 1301,
            h: willPowerRect.h,
          };
          debugRectJS(optionARect);
          const optionAType = findBestMatch(
            frame,
            optionARect,
            matOptionString
          );
          const optionAValue = findBestMatch(frame, optionARect, matNumeric);

          const optionBRect = {
            x: optionARect.x,
            y: willPowerRect.y + willPowerRect.h,
            w: optionARect.w,
            h: optionARect.h,
          };
          debugRectJS(optionBRect);
          const optionBType = findBestMatch(
            frame,
            optionBRect,
            matOptionString
          );
          const optionBValue = findBestMatch(frame, optionBRect, matNumeric);

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
            currentGems = [];
            break;
          }

          currentGems.push({
            gemAttr: gemAttr,
            req: willPower,
            point: corePoint,
            option1: {
              optionType: optionAType,
              value: optionAValue,
            },
            option2: {
              optionType: optionBType,
              value: optionBValue,
            },
          });
        }

        // 이제 currentGems는 현재 화면에 올바르게 인식된 젬들만 존재

        // 젬 추가
        const SAME_COUNT_THRESHOLD = 3;
        if (totalGems.length == 0) {
          // 현재 젬이 없다면 화면에 있는 젬으로 갈아치움
          // 이땐 개수가 꼭 9개가 아니어도 됨 (애초에 젬을 적게 깎은 사람들)
          totalGems = [...currentGems];
          console.log('init!', totalGems);
        } else {
          if (currentGems.length == 9) {
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
                  isSameArkGridGem(totalGems[foundIndex + i], currentGems[i])
                ) {
                  sameCount += 1;
                } else {
                  break;
                }
              }
              // 현재 화면에 있는 모든 젬이 이미 연속적으로 추가된 젬인 경우, 그냥 넘어감
              if (sameCount == 9) continue;

              // 스크롤을 너무 빠르게 내린 경우를 제외하기 위해서
              // 내 화면에 있는 젬 중 최소한 3개는 이미 알고 있는 경우에만 수행
              // 추가로 동일한 옵션의 젬을 오판정한 index인 경우 sameCount = 1이라서 걸러야 함
              if (sameCount >= SAME_COUNT_THRESHOLD) {
                // 내 화면의 sameCount부터 끝에 있는 젬들까지 추가 대상임
                for (let i = sameCount; i < 9; i++) {
                  totalGems.push(currentGems[i]);
                  console.log('추가:', currentGems[i]);
                }
                console.log(totalGems);
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
                  console.log(totalGems);
                }
              }
            }
          }
        }
      } else {
        // console.log(mm.maxVal);
      }

      frame.delete();
      result.delete();

      setTimeout(() => {
        requestAnimationFrame(loop);
      }, 100);
    }

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      debugCanvas.width = video.videoWidth;
      debugCanvas.height = video.videoHeight;
      requestAnimationFrame(loop);
    };
  }

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });
</script>

<div class="panel">
  <div>
    <button onclick={startCapture}>화면 공유 시작</button>
  </div>
  <div
    style="position: relative; height: 1080px; 
    border: 1px solid #aaa;"
  >
    <canvas class="ov" bind:this={debugCanvas}></canvas>
    <video class="ov" bind:this={video} autoplay muted></video>
  </div>
</div>

<style>
  .ov {
    position: absolute;
    top: 0;
    left: 0;
  }
  video.ov {
    z-index: 0;
  }

  canvas.ov {
    z-index: 1;
    pointer-events: none;
  }
</style>
