/**
 * CR AhzamyCode
 * Endpoint: /api/downloader/ytmp3
 * Desc: Download audio YouTube (MP3 128 kbps) via ssvid.net
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('url')?.trim();

  if (!query)
    return NextResponse.json({ success: false, error: 'Parameter "url" wajib diisi' }, { status: 400 });

  try {
    // step-1 search
    let search = await hit('/api/ajax/search', { query, cf_token: '', vt: 'youtube' });
    if (search.p === 'search') {
      if (!search.items?.length) throw new Error('Hasil pencarian kosong');
      const v = search.items[0].v;
      const videoUrl = `https://www.youtube.com/watch?v=${v}`;
      search = await hit('/api/ajax/search', { query: videoUrl, cf_token: '', vt: 'youtube' });
    }

    const vid = search.vid;
    const k = search.links?.mp3?.mp3128?.k;
    if (!k) throw new Error('Link MP3 tidak ditemukan');

    // step-2 convert
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
        quality: '128 kbps',
        format: 'mp3',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}