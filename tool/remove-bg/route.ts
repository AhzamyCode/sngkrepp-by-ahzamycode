/**
 * CR AhzamyCode
 * Endpoint: /api/tools/remove-bg
 * Desc: Hapus background gambar via remove.bg API.
 *       Input: file upload (form-data) atau URL (JSON).
 *       Output: PNG tanpa background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';
const API_KEY = process.env.REMOVE_BG_KEY || 'Am8wWXzVWc8pRHpfHw1obfg5';

/* ---------- validasi ---------- */
const urlSchema = z.object({ imageUrl: z.string().url() });

/* ---------- helpers ---------- */
async function callRemoveBg(data: FormData) {
  const res = await fetch(REMOVE_BG_URL, {
    method: 'POST',
    headers: { 'X-Api-Key': API_KEY },
    body: data,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`remove.bg ${res.status} ${txt}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/* ---------- handler ---------- */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  try {
    /* 1. file upload (multipart/form-data) */
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('image') as File | null;
      if (!file)
        return NextResponse.json(
          { success: false, error: 'Field "image" (file) wajib diisi' },
          { status: 400 }
        );

      if (file.size > 1_048_576)
        return NextResponse.json(
          { success: false, error: 'Ukuran file maksimal 1 MB' },
          { status: 413 }
        );
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type))
        return NextResponse.json(
          { success: false, error: 'Format harus JPG/PNG' },
          { status: 400 }
        );

      const fd = new FormData();
      fd.append('image_file', file);
      fd.append('size', 'auto');
      const buffer = await callRemoveBg(fd);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="no-bg.png"',
        },
      });
    }

    /* 2. JSON dengan imageUrl */
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { imageUrl } = urlSchema.parse(body);

      const fd = new FormData();
      fd.append('image_url', imageUrl);
      fd.append('size', 'auto');
      const buffer = await callRemoveBg(fd);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="no-bg.png"',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Content-Type harus multipart/form-data atau application/json' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}