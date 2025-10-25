import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/* ---------- helper (format & random) ---------- */
const formatPostInfo = (p: any) => ({
  ...p,
  postID: `https://lahelu.com/post/${p.postID}`,
  media: `${p.media}`,
  mediaThumbnail: p.mediaThumbnail
    ? `https://cache.lahelu.com/${p.mediaThumbnail}`
    : null,
  userUsername: `https://lahelu.com/user/${p.userUsername}`,
  userAvatar: `https://cache.lahelu.com/${p.userAvatar}`,
  createTime: new Date(p.createTime).toISOString(),
});

const randomCursor = () => `${Math.floor(Math.random() * 5)}-0`;

/* ---------- core scrape (header & alur KAMU) ---------- */
async function laheluSearch() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(
    `https://lahelu.com/api/post/get-recommendations?field=7&cursor=${randomCursor()}`,
    {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Referer: 'https://lahelu.com/',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'application/json, text/plain, */*',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        DNT: '1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        TE: 'Trailers',
        Host: 'lahelu.com',
        Origin: 'https://lahelu.com/',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );
  clearTimeout(t);

  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  const json = await res.json();
  if (!json.postInfos) throw new Error('No post data');
  return json.postInfos.map(formatPostInfo);
}

/* ---------- handler GET ---------- */
async function handleGET() {
  try {
    const data = await laheluSearch();
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Internal error' }, { status: 500 });
  }
}

/* ---------- handler POST ---------- */
async function handlePOST() {
  // sama persii seperti GET (random cursor)
  return handleGET();
}

/* ---------- main route ---------- */
export async function GET() {
  return handleGET();
}

export async function POST() {
  return handlePOST();
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