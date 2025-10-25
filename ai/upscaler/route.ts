// app/api/ai/upscaler/route.ts
/**
 * CR Ahzamycode
 * Handler untuk /api/ai/upscaler
 * upload file / URL → gambar 2× super-resolution
 * GET  : ?imageUrl=<url>
 * POST : multipart form-data key="image"  atau JSON {imageUrl:"..."}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';
import { randomBytes } from 'crypto';

const BASE = 'https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-unblur';
const UA = { 'user-agent': 'Kevyll-API/1.0' };

function randomHex(len: number): string {
  return randomBytes(len).toString('hex');
}

async function createJob(buffer: Buffer, filename: string): Promise<string> {
  const serial = randomHex(16);
  const form = new FormData();
  form.append('original_image_file', buffer, { filename, contentType: 'image/jpeg' });
  form.append('scale_factor', 2);
  form.append('upscale_type', 'image-upscale');

  const { data } = await axios.post(`${BASE}/create-job`, form, {
    headers: { ...form.getHeaders(), 'product-serial': serial, ...UA },
  });
  if (!data.result?.job_id) throw new Error('Gagal membuat job');
  return data.result.job_id;
}

async function pollUntilDone(jobId: string): Promise<string> {
  const timeout = Date.now() + 180_000;
  while (Date.now() < timeout) {
    const { data } = await axios.get(`${BASE}/get-job/${jobId}`, {
      headers: { 'product-serial': randomHex(16), ...UA },
    });
    if (data.code === 100000 && data.result?.output_url?.[0]) return data.result.output_url[0];
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Timeout: upscaling terlalu lama');
}

async function upscale(buffer: Buffer, filename: string): Promise<string> {
  const jobId = await createJob(buffer, filename);
  return await pollUntilDone(jobId);
}

/* ---------- GET ---------- */
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('imageUrl');
  if (!imageUrl) return NextResponse.json({ success: false, error: '?imageUrl= required', code: 400 }, { status: 400 });

  try {
    const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const outputUrl = await upscale(Buffer.from(data), 'image.jpg');
    return NextResponse.json({ success: true, data: { url: outputUrl }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Upscale gagal', code: 500 }, { status: 500 });
  }
}

/* ---------- POST ---------- */
export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  let buffer: Buffer, filename: string;

  try {
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const f = fd.get('image') as File | null;
      if (!f) return NextResponse.json({ success: false, error: 'field "image" required', code: 400 }, { status: 400 });
      buffer = Buffer.from(await f.arrayBuffer());
      filename = f.name;
    } else if (ct.includes('application/json')) {
      const b = await req.json();
      const u = b.imageUrl;
      if (!u) return NextResponse.json({ success: false, error: 'imageUrl required', code: 400 }, { status: 400 });
      const { data } = await axios.get(u, { responseType: 'arraybuffer' });
      buffer = Buffer.from(data);
      filename = 'image.jpg';
    } else {
      return NextResponse.json({ success: false, error: 'Content-Type harus multipart/form-data atau application/json', code: 400 }, { status: 400 });
    }

    const outputUrl = await upscale(buffer, filename);
    return NextResponse.json({ success: true, data: { url: outputUrl }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Upscale gagal', code: 500 }, { status: 500 });
  }
}