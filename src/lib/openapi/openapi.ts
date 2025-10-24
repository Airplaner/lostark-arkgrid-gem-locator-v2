import { openAPIConfig } from '../../stores/store';

export interface openAPIConfigDef {
  jwt: string | null;
  charname: string | null;
}
const HOST = 'https://developer-lostark.game.onstove.com';

interface FetchParams {
  [key: string]: string | number | boolean;
}

async function openAPIFetch(
  config: openAPIConfigDef,
  path: string,
  params?: FetchParams,
  jsonBody?: any
): Promise<any> {
  // query string 생성
  const queryString = params
    ? '?' +
      Object.entries(params)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&')
    : '';

  // fetch 옵션
  const options: RequestInit = {
    method: jsonBody ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${config.jwt}`,
      'Content-Type': jsonBody ? 'application/json' : 'application/x-www-form-urlencoded',
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  };

  const res = await fetch(HOST + path + queryString, options);

  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status} ${res.statusText}`);
  }

  return res.json(); // JSON으로 반환
}

export async function getCharArkPassive(config: openAPIConfigDef) {
  const res = await openAPIFetch(config, '/armories/characters/' + config.charname + '/arkgrid');
  return res
}
