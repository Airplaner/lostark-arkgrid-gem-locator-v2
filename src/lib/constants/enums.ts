export enum ArkGridAttr {
  Order = '질서',
  Chaos = '혼돈',
}
export enum ArkGridGrade {
  EPIC = '영웅',
  LEGENDARY = '전설',
  RELIC = '유물',
  ANCIENT = '고대',
}
export function reverseLookup<T>(
  enumType: T,
  value: string
): T[keyof T] | undefined {
  for (const key in enumType) {
    if (
      Object.hasOwnProperty.call(enumType, key) &&
      (enumType[key] as any) === value
    ) {
      return enumType[key];
    }
  }
  return undefined;
}
