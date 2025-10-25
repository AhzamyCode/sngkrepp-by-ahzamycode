/**
 * CR AhzamyCode
 * Endpoint: /api/downloader/ytmp4
 * Desc: Download video YouTube (MP4) via ssvid.net
 * Query: url & quality (360p,720p,1080p) default 720p
 */

import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = 'https://ssvid.net';

async function hit(path: string, payload: Record<string, string>) {
  const body = new URLSearchParams(payload);
  const r = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      origin: ORIGIN,
      referer: ORIGIN + '/youtube-to-mp3',
    },
    body,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${await r.text()}`);
  return r.json();
}

function pickQuality(want: string, links: any) {
  const mp4 = links?.mp4 || {};
  const list = Object.entries(mp4)
    .map(([, v]: any) => v)
    .filter((v: any) => /\d+p/.test(v.q))
    .sort((a: any, b: any) => parseInt(b.q) - parseInt(a.q));

  if (!list.length) throw new Error('MP4 link tidak ditemukan');

  const exact = list.find((v: any) => v.q === want);
  return exact ? exact.k : list[0].k; // fallback highest
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('url')?.trim();
  const quality = searchParams.get('quality') || '720p'; // 360p,720p,1080p

  if (!query)
    return NextResponse.json({ success: false, error: 'Parameter "url" wajib diisi' }, { status: 400 });

  try {
    let search = await hit('/api/ajax/search', { query, cf_token: '', vt: 'youtube' });
    if (search.p === 'search') {
      if (!search.items?.length) throw new Error('Hasil pencarian kosong');
      const v = search.items[0].v;
      const videoUrl = `https://www.youtube.com/watch?v=${v}`;
      search = await hit('/api/ajax/search', { query: videoUrl, cf_token: '', vt: 'youtube' });
    }

    const vid = search.vid;
    const k = pickQuality(quality, search.links);
    let convert = await hit('/api/ajax/convert', { k, vid });

    if (convert.c_status === 'CONVERTING') {
      let attempt = 0;
      do {
        attempt++;
        convert = await hit('/api/convert/check?hl=en', { vid, b_id: convert.b_id });
        if (convert.c_status === 'CONVERTED') break;
        await new Promise(r => setTimeout(r, 5000));
      } while (attempt < 5 && convert.c_status === 'CONVERTING');
    }
    if (convert.c_status !== 'CONVERTED') throw new Error('File belum siar');

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: {
        title: search.title,
        duration: search.duration,
        downloadUrl: convert.dlink,
        quality: quality,
        format: 'mp4',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}