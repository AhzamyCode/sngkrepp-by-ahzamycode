/**
 * CR AhzamyCode
 * Endpoint: /api/downloader/capcut
 * Desc: Download CapCut video tanpa watermark via anydownloader.com
 */

import { NextRequest, NextResponse } from 'next/server';

const ENDPOINT = 'https://anydownloader.com/wp-json/api/download/';
const STATIC_TOKEN = '153d8f770cb72578abab74c2e257fb85a1fd60dcb0330e32706763c90448ae01';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();

  if (!url)
    return NextResponse.json(
      { success: false, error: 'Parameter "url" wajib diisi' },
      { status: 400 }
    );

  try {
    const hash = btoa(url + '1037YXBp'); // sama dengan Base64 + salt
    const body = new URLSearchParams({
      url,
      token: STATIC_TOKEN,
      hash,
    });

    const ext = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://anydownloader.com',
        Referer: 'https://anydownloader.com/en/online-capcut-video-downloader-without-watermark/',
        'User-Agent': 'Mozilla/5.0',
      },
      body,
    });

    if (!ext.ok) throw new Error('Gagal mengambil data dari CapCut');

    const data = await ext.json();

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}