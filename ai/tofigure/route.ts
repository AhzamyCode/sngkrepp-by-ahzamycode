/**
 * CR AhzamyCode
 * Endpoint: /api/ai/tofigure
 * GET  : ?imageUrl=https://...
 * POST : {imageUrl:"https://..."} atau multipart/form-data (file)
 * Hasil: PNG figurine (pakai API nekolabs)
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

const NEKO = 'https://api.nekolabs.my.id/tools/convert/tofigure';

/* ---------- utils ---------- */
async function figNeko(buffer: Buffer) {
  const body = new FormData();
  body.append('files[]', buffer, { filename: 'img.jpg', contentType: 'image/jpeg' });

  const { data } = await axios.post('https://uguu.se/upload.php', body, { headers: body.getHeaders() });
  const url = encodeURIComponent(data.files[0].url);

  const { data: res } = await axios.get(`${NEKO}?imageUrl=${url}`);
  if (!res.result) throw new Error(res.message || 'Gagal jadi figurine');

  const png = await axios.get(res.result, { responseType: 'arraybuffer' });
  return Buffer.from(png.data);
}

/* ---------- core ---------- */
async function proc(buffer: Buffer) {
  if (buffer.length > 5 * 1024 * 1024) throw new Error('Max 5 MB');
  return await figNeko(buffer);
}

/* ---------- GET ---------- */
export async function GET(req: NextRequest) {
  const u = new URL(req.url).searchParams.get('imageUrl');
  if (!u) return NextResponse.json({ success: false, error: '?imageUrl= required' }, { status: 400 });
  try {
    const { data } = await axios.get(u, { responseType: 'arraybuffer' });
    const out = await proc(Buffer.from(data));
    return new NextResponse(out, {
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="figurine.png"' },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/* ---------- POST ---------- */
export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  try {
    let buf: Buffer;
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const f = fd.get('image') as File | null;
      if (!f) return NextResponse.json({ success: false, error: 'field "image" required' }, { status: 400 });
      buf = Buffer.from(await f.arrayBuffer());
    } else if (ct.includes('application/json')) {
      const b = await req.json();
      const u = b.imageUrl;
      if (!u) return NextResponse.json({ success: false, error: 'imageUrl required' }, { status: 400 });
      const { data } = await axios.get(u, { responseType: 'arraybuffer' });
      buf = Buffer.from(data);
    } else {
      return NextResponse.json({ success: false, error: 'Content-Type harus multipart/form-data atau application/json' }, { status: 400 });
    }
    const out = await proc(buf);
    return new NextResponse(out, {
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="figurine.png"' },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}