// app/api/downloader/v2/all/route.ts
/**
 * CR Ahzamycode
 * J2Download.com universal scraper v2
 * Support 70+ platform: TikTok, IG, FB, YT, X, BiliBili, Spotify, dsb.
 * GET  : ?url=<link>
 * POST : JSON {url:<link>}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36';

async function j2download(url: string) {
  const baseHeaders = {
    authority: 'j2download.com',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'user-agent': UA,
  };

  // 1. ambil CSRF & cookie
  const home = await axios.get('https://j2download.com/', {
    headers: { ...baseHeaders, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8', 'upgrade-insecure-requests': '1' },
  });

  const setCookies = home.headers['set-cookie'] || [];
  const cookies = setCookies.map((c: string) => c.split(';')[0]).join('; ');
  const csrfToken = setCookies.find((c: string) => c.includes('csrf_token='))?.split('csrf_token=')[1].split(';')[0] || '';

  // 2. autolink
  const { data } = await axios.post(
    'https://j2download.com/api/autolink',
    { data: { url, unlock: true } },
    {
      headers: {
        ...baseHeaders,
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        cookie: cookies,
        origin: 'https://j2download.com',
        referer: 'https://j2download.com/id',
        'x-csrf-token': csrfToken,
      },
    }
  );

  return data;
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim();
  if (!url) return NextResponse.json({ success: false, creator: "Ahzamycode", error: '?url= required', code: 400 }, { status: 400 });

  try {
    const result = await j2download(url);
    if (!result) throw new Error('Scrape returned null');
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body.url?.trim();
  if (!url) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'url required', code: 400 }, { status: 400 });

  try {
    const result = await j2download(url);
    if (!result) throw new Error('Scrape returned null');
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}