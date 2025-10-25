import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ORIGIN = 'https://ytmp3.cx';
const HEADERS = { 'user-agent': 'kompascom-android', 'accept-encoding': 'gzip, deflate, br, zstd' };

function extractVideoId(fV: string): string {
  let v;
  if (fV.includes('youtu.be')) v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV);
  else if (fV.includes('youtube.com')) {
    if (fV.includes('/shorts/')) v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV);
    else v = /v\=([a-zA-Z0-9\-\_]{11})/.exec(fV);
  }
  const result = v?.[1];
  if (!result) throw new Error('gagal extract video id');
  return result;
}

async function getInitUrl() {
  const html = await fetch(ORIGIN, { headers: HEADERS }).then((r) => r.text());
  const jsPath = html.match(/<script src="(.+?)"/)?.[1];
  if (!jsPath) throw new Error('jsPath not found');
  const jsUrl = ORIGIN + jsPath;
  const js = await fetch(jsUrl, { headers: HEADERS }).then((r) => r.text());

  const gB_m = js.match(/gB\s*=\s*(\d+)/)?.[1];
  const html_m = html.match(/<script>([^<]*gC[^<]*)<\/script>/)?.[1];
  if (!gB_m || !html_m) throw new Error('gB/gC not found');

  const decodeBin = (d: string) => d.split(' ').map((v) => parseInt(v, 2));
  const decodeHex = (d: string) => (d.match(/0x[a-fA-F0-9]{2}/g) || []).map((v) => String.fromCharCode(parseInt(v, 16))).join('');

  const d1 = html_m.match(/gC\.d\(1\)\[0\]\s*=\s*"([^"]+)"/)?.[1] ?? '';
  const d1b = html_m.match(/gC\.d\(1\)\[1\]\s*=\s*"([^"]+)"/)?.[1] ?? '';
  const d20 = parseInt(html_m.match(/gC\.d\(2\)\[0\]\s*=\s*(\d+)/)?.[1] ?? '0', 10);
  const d21 = parseInt(html_m.match(/gC\.d\(2\)\[1\]\s*=\s*(\d+)/)?.[1] ?? '0', 10);
  const d22 = parseInt(html_m.match(/gC\.d\(2\)\[2\]\s*=\s*(\d+)/)?.[1] ?? '0', 10);
  const d23 = parseInt(html_m.match(/gC\.d\(2\)\[3\]\s*=\s*(\d+)/)?.[1] ?? '0', 10);
  const d3 = html_m.match(/gC\.d\(3\)\[0\]\s*=\s*"([^"]+)"/)?.[1] ?? '';

  const dec = decodeBin(d1);
  let k = '';
  for (let i = 0; i < dec.length; i++) k += d20 > 0 ? atob(d1b).split('').reverse().join('')[dec[i] - d21] : atob(d1b)[dec[i] - d21];
  if (d22 > 0) k = k.substring(0, d22);
  const tail = decodeHex(d3);
  switch (d23) {
    case 0: return btoa(k + '_' + tail);
    case 1: return btoa(k.toLowerCase() + '_' + tail);
    case 2: return btoa(k.toUpperCase() + '_' + tail);
    default: return btoa(k + '_' + tail);
  }
}

async function downloadMP4(url: string) {
  const v = extractVideoId(url);
  const headers = { referer: ORIGIN, ...HEADERS };
  const initApi = await getInitUrl();
  const r1 = await fetch(initApi, { headers });
  const j1 = await r1.json();
  const { convertURL } = j1;
  const convertApi = convertURL + '&v=' + v + '&f=mp4&_=' + Math.random(); // <-- mp4
  const r2 = await fetch(convertApi, { headers });
  const j2 = await r2.json();
  if (j2.error) throw new Error(`convert error:\n${JSON.stringify(j2, null, 2)}`);
  if (j2.redirectURL) {
    const r3 = await fetch(j2.redirectURL, { headers });
    const j3 = await r3.json();
    return { title: j3.title, downloadURL: j3.downloadURL, format: 'mp4' }; // <-- mp4
  } else {
    let j3b: any;
    do {
      const r3b = await fetch(j2.progressURL, { headers });
      j3b = await r3b.json();
      if (j3b.error) throw new Error(`progress error:\n${JSON.stringify(j3b, null, 2)}`);
      if (j3b.progress == 3) return { title: j3b.title, downloadURL: j2.downloadURL, format: 'mp4' }; // <-- mp4
      await new Promise((r) => setTimeout(r, 3000));
    } while (j3b.progress != 3);
    return { title: j3b.title, downloadURL: j2.downloadURL, format: 'mp4' }; // <-- mp4
  }
};

/* ---------- handler GET ---------- */
async function handleGET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim() ?? '';
  if (!url) return NextResponse.json({ success: false, error: 'url wajib' }, { status: 400 });

  try {
    const result = await downloadMP4(url);
    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/* ---------- handler POST ---------- */
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = (body.url ?? '').trim();
  if (!url) return NextResponse.json({ success: false, error: 'url wajib' }, { status: 400 });

  try {
    const result = await downloadMP4(url);
    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/* ---------- main route ---------- */
export async function GET(req: NextRequest) {
  return handleGET(req);
}

export async function POST(req: NextRequest) {
  return handlePOST(req);
}

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