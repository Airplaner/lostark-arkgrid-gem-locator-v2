import type { ArkGridGem, ArkGridGemOptionName } from './arkGridGems';

/**
 * Score per Gem by Shizukaziya
 *
 * @see https://www.youtube.com/watch?v=F9a-FPHBhSc
 */

const optionTypeScores: { [type in ArkGridGemOptionName]?: number } = {
  "공격력": 1.0,// att
  '보스 피해':2.55,// boss damage
  '추가 피해':1.85,// additional damage
};
export const scoreGem = (gem: ArkGridGem)=>{
  const reqScore = (4-gem.req)*2.4
  const pointScore = (gem.point - 4) * 5.14;
  const opt1Score = optionTypeScores[gem.option1.optionType]
  const opt2Score = optionTypeScores[gem.option2.optionType]

  return reqScore + pointScore + (opt1Score ? opt1Score * gem.option1.value : 0) + (opt2Score ? opt2Score * gem.option2.value : 0)
}