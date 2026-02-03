export const ArkGridAttrs = {
  Order: '질서',
  Chaos: '혼돈',
} as const;
export type ArkGridAttr = (typeof ArkGridAttrs)[keyof typeof ArkGridAttrs];

export const LostArkGrades = {
  EPIC: '영웅',
  LEGENDARY: '전설',
  RELIC: '유물',
  ANCIENT: '고대',
} as const;
export type LostArkGrade = (typeof LostArkGrades)[keyof typeof LostArkGrades];

export function reverseLookup<const T extends Record<string, string>>(
  obj: T,
  input: string
): T[keyof T] | undefined {
  return Object.values(obj).find((v) => v === input) as T[keyof T] | undefined;
}

export const DEFAULT_PROFILE_NAME = '기본';

export type ScrollCommand = 'top' | 'bottom' | null;

export const DISCORD_URL = 'https://discord.gg/Zk4K3xt9ub';
export const KAKAOTALK_URL = 'https://open.kakao.com/o/s5bTYodi';

// XXX BCP 47에 따르면 ko-kr이 맞다... (https://www.rfc-editor.org/rfc/bcp/bcp47.txt)
export type AppLocale = 'ko_kr' | 'en_us';
export const supportedLocales: AppLocale[] = ['ko_kr', 'en_us'];
