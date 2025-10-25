// app/api/maker/pixel-art/route.ts
/**
 * CR Ahzamycode
 * Pixel-art generator: image→pixel atau text→pixel
 * GET  : ?type=<img2pixel|txt2pixel>&prompt=<teks>&ratio=<1:1|3:2|2:3>
 * POST : JSON {type:<tipe>, prompt?:<teks>, image?:<file|url>, ratio?:<aspect>}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomBytes } from 'crypto';

const BASE = 'https://pixelartgenerator.app/api';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

const RATIOS = ['1:1', '3:2', '2:3'] as const;
type Ratio = typeof RATIOS[number];

/* ---------- core ---------- */
async function waitTask(taskId: string): Promise<string> {
  for (let i = 0; i < 120; i++) {
    const { data } = await axios.get(`${BASE}/pixel/status?taskId=${taskId}`, {
      headers: { 'content-type': 'application/json', referer: 'https://pixelartgenerator.app/', 'user-agent': UA },
    });
    if (data.data.status === 'SUCCESS') return data.data.images[0];
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Task timeout');
}

async function img2pixel(buffer: Buffer, ratio: Ratio): Promise<string> {
  const fname = `${randomBytes(8).toString('hex')}.jpg`;
  // 1. presigned url
  const { data: pre } = await axios.post(
    `${BASE}/upload/presigned-url`,
    { filename: fname, contentType: 'image/jpeg', type: 'pixel-art-source' },
    { headers: { 'content-type': 'application/json', referer: 'https://pixelartgenerator.app/', 'user-agent': UA } }
  );
  // 2. upload
  await axios.put(pre.data.uploadUrl, buffer, {
    headers: { 'content-type': 'image/jpeg', 'content-length': buffer.length },
  });
  // 3. generate
  const { data: gen } = await axios.post(
    `${BASE}/pixel/generate`,
    { imageKey: pre.data.key, prompt: '', size: ratio, type: 'image' },
    { headers: { 'content-type': 'application/json', referer: 'https://pixelartgenerator.app/', 'user-agent': UA } }
  );
  return waitTask(gen.data.taskId);
}

async function txt2pixel(prompt: string, ratio: Ratio): Promise<string> {
  const { data } = await axios.post(
    `${BASE}/pixel/generate`,
    { prompt, size: ratio, type: 'text' },
    { headers: { 'content-type': 'application/json', referer: 'https://pixelartgenerator.app/', 'user-agent': UA } }
  );
  return waitTask(data.data.taskId);
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') as 'img2pixel' | 'txt2pixel' | null;
  const ratio = (sp.get('ratio') as Ratio) || '1:1';
  if (!RATIOS.includes(ratio)) return NextResponse.json({ success: false, error: 'ratio invalid (1:1, 3:2, 2:3)', code: 400 }, { status: 400 });

  try {
    let url = '';
    if (type === 'txt2pixel') {
      const prompt = sp.get('prompt')?.trim();
      if (!prompt) return NextResponse.json({ success: false, error: '?prompt= required for txt2pixel', code: 400 }, { status: 400 });
      url = await txt2pixel(prompt, ratio);
    } else if (type === 'img2pixel') {
      const imageUrl = sp.get('imageUrl')?.trim();
      if (!imageUrl) return NextResponse.json({ success: false, error: '?imageUrl= required for img2pixel', code: 400 }, { status: 400 });
      const { data: img } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      url = await img2pixel(Buffer.from(img), ratio);
    } else {
      return NextResponse.json({ success: false, error: '?type= required (img2pixel|txt2pixel)', code: 400 }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { url, ratio, type }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Pixel gagal', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  const body = (await req.json().catch(() => ({}))) as any;
  const type = body.type as 'img2pixel' | 'txt2pixel' | null;
  const ratio = (body.ratio as Ratio) || '1:1';
  if (!RATIOS.includes(ratio)) return NextResponse.json({ success: false, error: 'ratio invalid (1:1, 3:2, 2:3)', code: 400 }, { status: 400 });

  try {
    let url = '';
    if (type === 'txt2pixel') {
      const prompt = body.prompt?.trim();
      if (!prompt) return NextResponse.json({ success: false, error: 'prompt required for txt2pixel', code: 400 }, { status: 400 });
      url = await txt2pixel(prompt, ratio);
    } else if (type === 'img2pixel') {
      let buffer: Buffer;
      if (ct.includes('multipart/form-data')) {
        const fd = await req.formData();
        const f = fd.get('image') as File | null;
        if (!f) return NextResponse.json({ success: false, error: 'field "image" required', code: 400 }, { status: 400 });
        buffer = Buffer.from(await f.arrayBuffer());
      } else {
        const imageUrl = body.imageUrl?.trim();
        if (!imageUrl) return NextResponse.json({ success: false, error: 'imageUrl required for img2pixel', code: 400 }, { status: 400 });
        const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        buffer = Buffer.from(data);
      }
      url = await img2pixel(buffer, ratio);
    } else {
      return NextResponse.json({ success: false, error: 'type required (img2pixel|txt2pixel)', code: 400 }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { url, ratio, type }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Pixel gagal', code: 500 }, { status: 500 });
  }
}