/*  CR : Ahzamycode
    Endpoint : /api/downloader/v2/ytmp3
    Base     : https://ytmp3.cx
*/
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/* ---------- konfig ---------- */
const ORIGIN   = 'https://ytmp3.cx';          // <— spasi dihapus
const HEADERS  = {
  'user-agent': 'kompascom-android',
  'accept-encoding': 'gzip, deflate, br, zstd'
};

/* ---------- helpers ---------- */
function extractVideoId(fV: string): string {
  let m: RegExpExecArray | null = null;
  if (fV.includes('youtu.be'))            m = /\/([a-zA-Z0-9\-_]{11})/.exec(fV);
  else if (fV.includes('youtube.com')) {
    if (fV.includes('/shorts/'))          m = /\/([a-zA-Z0-9\-_]{11})/.exec(fV);
    else                                  m = /[?&]v=([a-zA-Z0-9\-_]{11})/.exec(fV);
  }
  if (!m?.[1]) throw new Error('gagal extract video id');
  return m[1];
}

/* ambil init token (yg lama `gB`) */
async function getInitUrl() {
  // 1. fetch homepage
  const html = await fetch(ORIGIN, { headers: HEADERS }).then(r => {
    if (!r.ok) throw new Error(`homepage ${r.status}`);
    return r.text();
  });

  // 2. ambil path JS
  const jsPath = html.match(/<script\s+src="(\/[^"]+\.js)"/)?.[1];
  if (!jsPath) throw new Error('jsPath not found');
  const jsUrl = ORIGIN + jsPath;

  // 3. fetch JS
  const js = await fetch(jsUrl, { headers: HEADERS }).then(r => {
    if (!r.ok) throw new Error(`js ${r.status}`);
    return r.text();
  });

  // 4. ambil gC + gB (token)
  const htmlScript = html.match(/<script[^>]*>([^<]*gC[^<]*)<\/script>/)?.[1] ?? '';
  if (!htmlScript.includes('gC')) throw new Error('gC script not found');

  // gB sekarang berbentuk  gB=atob("...")
  const gB_b64 = js.match(/gB\s*=\s*atob\("([^"]+)"\)/)?.[1];
  if (!gB_b64) throw new Error('gB not found');

  /* ---------- parser gC ---------- */
  const decodeBin = (d: string) => d.split(' ').map(v => parseInt(v, 2));
  const decodeHex = (d: string) =>
    (d.match(/0x[0-9a-f]{2}/gi) || [])
      .map(h => String.fromCharCode(parseInt(h, 16)))
      .join('');

  // nilai2 gC
  const d1  = htmlScript.match(/gC\.d\(1\)\[0\]\s*=\s*"([^"]+)"/)?.[1] ?? '';
  const d1b = htmlScript.match(/gC\.d\(1\)\[1\]\s*=\s*"([^"]+)"/)?.[1] ?? '';
  const d20 = Number(htmlScript.match(/gC\.d\(2\)\[0\]\s*=\s*(\d+)/)?.[1] ?? 0);
  const d21 = Number(htmlScript.match(/gC\.d\(2\)\[1\]\s*=\s*(\d+)/) ?.[1] ?? 0);
  const d22 = Number(htmlScript.match(/gC\.d\(2\)\[2\]\s*=\s*(\d+)/)?.[1] ?? 0);
  const d23 = Number(htmlScript.match(/gC\.d\(2\)\[3\]\s*=\s*(\d+)/)?.[1] ?? 0);
  const d3  = htmlScript.match(/gC\.d\(3\)\[0\]\s*=\s*"([^"]+)"/)?.[1] ?? '';

  if (!d1 || !d1b) throw new Error('gC.d(1) incomplete');

  // rekonstruksi key
  const dec = decodeBin(d1);
  let k = '';
  for (let i = 0; i < dec.length; i++) {
    const idx = dec[i] - d21;
    const dict = d20 > 0 ? atob(d1b).split('').reverse().join('') : atob(d1b);
    k += dict[idx];
  }
  if (d22 > 0) k = k.substring(0, d22);
  const tail = decodeHex(d3);

  let rawToken = '';
  switch (d23) {
    case 0: rawToken = k + '_' + tail; break;
    case 1: rawToken = k.toLowerCase() + '_' + tail; break;
    case 2: rawToken = k.toUpperCase() + '_' + tail; break;
    default: rawToken = k + '_' + tail;
  }
  return btoa(rawToken); // ini dipakai sebagai path "/try/..."
}

/* ---------- proses download ---------- */
async function downloadMP3(url: string) {
  const v = extractVideoId(url);
  const initApi = ORIGIN + '/try/' + await getInitUrl();
  const headers = { referer: ORIGIN, ...HEADERS };

  // 1. minta convertURL
  const r1 = await fetch(initApi, { headers });
  if (!r1.ok) throw new Error(`initApi ${r1.status}`);
  const j1 = await r1.json() as any;
  const { convertURL } = j1;
  if (!convertURL) throw new Error('convertURL not returned');

  // 2. mulai convert
  const convertApi = `${convertURL}&v=${v}&f=mp3&_=${Math.random()}`;
  const r2 = await fetch(convertApi, { headers });
  if (!r2.ok) throw new Error(`convertApi ${r2.status}`);
  const j2 = await r2.json() as any;
  if (j2.error) throw new Error(`convert error: ${JSON.stringify(j2)}`);

  // 3. langsung redirect atau progress?
  if (j2.redirectURL) {
    const r3 = await fetch(j2.redirectURL, { headers });
    const j3 = await r3.json() as any;
    return { title: j3.title, downloadURL: j3.downloadURL, format: 'mp3' };
  }

  if (!j2.progressURL) throw new Error('progressURL not returned');

  // polling progress
  let j3b: any;
  let tries = 0;
  do {
    await new Promise(r => setTimeout(r, 3000));
    const r3b = await fetch(j2.progressURL, { headers });
    j3b = await r3b.json() as any;
    if (j3b.error) throw new Error(`progress error: ${JSON.stringify(j3b)}`);
    if (++tries > 20) throw new Error('progress timeout');
  } while (j3b.progress !== 3);

  return { title: j3b.title, downloadURL: j2.downloadURL, format: 'mp3' };
}

/* ---------- route handler ---------- */
async function handleRequest(req: NextRequest) {
  let url = '';
  if (req.method === 'GET') {
    url = new URL(req.url).searchParams.get('url')?.trim() ?? '';
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      url = (body.url ?? '').trim();
    } catch { /* noop */ }
  }
  if (!url) return NextResponse.json({ success: false, error: 'url wajib' }, { status: 400 });

  try {
    const data = await downloadMP3(url);
    return NextResponse.json({ success: true, data, ts: new Date().toISOString() });
  } catch (e: any) {
    console.error('[ytmp3 error]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export const GET  = handleRequest;
export const POST = handleRequest;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}