// src/app/api/ai/img2text/route.ts
// Next.js 15 + Edge + TypeScript (strict)

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // 😎 Edge Runtime

/* ---------- konfig ---------- */
const UPSTREAM = 'https://be.neuralframes.com/clip_interrogate/';
const AUTH =
  'Bearer uvcKfXuj6Ygncs6tiSJ6VXLxoapJdjQ3EEsSIt45Zm+vsl8qcLAAOrnnGWYBccx4sbEaQtCr416jxvc/zJNAlcDjLYjfHfHzPpfJ00l05h0oy7twPKzZrO4xSB+YGrmCyb/zOduHh1l9ogFPg/3aeSsz+wZYL9nlXfXdvCqDIP9bLcQMHiUKB0UCGuew2oRt';

/* ---------- util ---------- */
const randomIp = () =>
  `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(
    Math.random() * 256
  )}.${Math.floor(Math.random() * 256)}`;

/* ---------- util ---------- */
async function bufferFromUrl(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch image ${r.status}`);
  const buf = await r.arrayBuffer();
  if (!r.headers.get('content-type')?.startsWith('image/'))
    throw new Error('URL bukan gambar');
  return buf;
}

async function neuralframes(buf: ArrayBuffer, filename = 'image.jpg'): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([buf]), filename);

  const res = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      Authorization: AUTH,
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      Referer: 'https://www.neuralframes.com/tools/image-to-prompt',
    },
    body: form,
  });

  if (!res.ok) throw new Error(`neuralframes ${res.status}`);
  const json: { prompt?: string } = await res.json();
  if (!json.prompt) throw new Error('prompt tidak ditemukan di response');
  return json.prompt;
}

/* ---------- handler ---------- */
async function handle(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let buffer: ArrayBuffer;
    let filename = 'image.jpg';

    /* 1) imageUrl mode (GET / POST json) */
    if (!contentType.includes('multipart/form-data')) {
      const { searchParams } = new URL(req.url);
      let imageUrl = searchParams.get('imageUrl')?.trim() ?? '';
      if (!imageUrl && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        imageUrl = (body.imageUrl ?? '').trim();
      }
      if (!imageUrl)
        return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'imageUrl wajib' }, { status: 400 });
      buffer = await bufferFromUrl(imageUrl);
    } else {
      /* 2) file upload mode */
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file || !file.type.startsWith('image/'))
        return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'File bukan image' }, { status: 400 });
      buffer = await file.arrayBuffer();
      filename = file.name;
    }

    const prompt = await neuralframes(buffer, filename);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: { prompt }, ts: new Date().toISOString() });
  } catch (e: any) {
    console.error('[img2text]', e);
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;

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