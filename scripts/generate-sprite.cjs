const fs = require('fs');
const path = require('path');
const Spritesmith = require('spritesmith');

const templateFolders = [
  { folder: './opencv-templates/en_us', lang: 'en_us' },
  { folder: './opencv-templates/ko_kr', lang: 'ko_kr' },
];

const publicDir = './public';
const tsOutputDir = './src/lib/opencv-template-coords';

// TS output 폴더가 없으면 생성
if (!fs.existsSync(tsOutputDir)) fs.mkdirSync(tsOutputDir, { recursive: true });

templateFolders.forEach(({ folder, lang }) => {
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.png'))
    .map((f) => path.join(folder, f));

  if (files.length === 0) {
    console.warn(`No PNG files found in ${folder}, skipping...`);
    return;
  }

  Spritesmith.run({ src: files, padding: 2 }, (err, result) => {
    if (err) {
      console.error(`Error generating sprite for ${lang}:`, err);
      return;
    }

    // 스프라이트 이미지 저장
    const spritePath = path.join(publicDir, `opencv_template_${lang}.png`);
    fs.writeFileSync(spritePath, result.image);
    console.log(`Saved sprite: ${spritePath}`);

    // TS 파일 생성
    const tsPath = path.join(tsOutputDir, `${lang}.ts`);
    const tsContentLines = ['// THIS FILE IS AUTO-GENERATED. DO NOT MODIFY ITSELF'];

    // 언어별 상수 이름: koKrCoords / enUsCoords
    const langConstName = lang === 'ko_kr' ? 'koKrCoords' : 'enUsCoords';
    tsContentLines.push(`export const ${langConstName} = {`);

    Object.entries(result.coordinates).forEach(([filePath, rect]) => {
      const fileName = path.basename(filePath);
      tsContentLines.push(
        `  '${fileName}': { x: ${rect.x}, y: ${rect.y}, w: ${rect.width}, h: ${rect.height} },`
      );
    });

    tsContentLines.push('} as const;\n');

    // TemplateName 타입 추가
    const typeName = lang === 'ko_kr' ? 'KoKrTemplateName' : 'EnUsTemplateName';
    tsContentLines.push(`export type ${typeName} = keyof typeof ${langConstName};\n`);

    fs.writeFileSync(tsPath, tsContentLines.join('\n'));
    console.log(`Saved TS coords with type: ${tsPath}`);
  });
});
