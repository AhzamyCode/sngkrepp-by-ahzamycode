/**
 * CR Ahzamycode
 * Endpoint: /api/image/brat
 * Support: GET + POST
 * Hasil: teks besar + blur halus, mulai kiri, margin kanan-kiri 35 px
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';
import sharp from 'sharp';

const generateImage = async (text: string) => {
  const size = 512;
  const padX = 30;               // margin kiri & kanan
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // bg putih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // font besar + tebal + tracking tipis
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 140px "Arial Rounded MT Bold", "Arial Black", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.setTransform(0.9, 0, 0, 1, 0, 0); // gepek horizontal

  // wrap 2 baris max
  const words = text.trim().split(/\s+/);
  let line = '';
  const lines: string[] = [];

  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > size - padX * 2) {
      lines.push(line.trim());
      line = w + ' ';
      if (lines.length === 2) break; // cukup 2 baris
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trim());

  // gambar baris per baris (kiri)
  const lineHeight = 150;
  let y = 40; // mulai agak bawah sedikit
  for (const l of lines) {
    ctx.fillText(l, padX, y);
    y += lineHeight;
  }

  const png = canvas.toBuffer('image/png');

  // blur halus + webp
  const webp = await sharp(png)
    .resize(512, 512)
    .blur(1.4)
    .webp({ quality: 95 })
    .toBuffer();

  return webp;
};

/* ---------- handler sama ---------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');
  if (!text)
    return NextResponse.json({
      success: false,
      message: 'Gunakan ?text=YOUR_TEXT pada URL.',
    });

  const webp = await generateImage(text);
  return new NextResponse(new Uint8Array(webp), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Disposition': 'inline; filename="brat.webp"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text)
      return NextResponse.json(
        { success: false, error: 'text required' },
        { status: 400 }
      );

    const webp = await generateImage(text);
    return new NextResponse(new Uint8Array(webp), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'inline; filename="brat.webp"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}