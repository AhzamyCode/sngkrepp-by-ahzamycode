/**
 * CR FongsiDev
 * Handler untuk /api/ai/catvideo
 * prompt → video kucing lucu (aiLabs)
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/* ---------- config ---------- */
const BASE = 'https://text2pet.zdex.top';
const ENDPOINTS = {
  images: '/images',
  videos: '/videos',
  videosBatch: '/videos/batch',
};

const UA = { 'user-agent': 'NB Android/1.0.0', 'accept-encoding': 'gzip' };

/* ---------- token stuff ---------- */
const CIPHER = 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW';
const SHIFT = 3;

function dec(text: string, shift: number): string {
  return [...text]
    .map(c =>
      /[a-z]/.test(c)
        ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97)
        : /[A-Z]/.test(c)
        ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65)
        : c
    )
    .join('');
}

let tokenCache: string | null = null;
async function getToken(): Promise<string> {
  if (tokenCache) return tokenCache;
  tokenCache = dec(CIPHER, SHIFT);
  return tokenCache;
}

/* ---------- utils ---------- */
function deviceId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/* ---------- core ---------- */
async function generateVideo(prompt: string) {
  const token = await getToken();
  const payload = {
    deviceID: deviceId(),
    isPremium: 1,
    prompt,
    used: [],
    versionCode: 6,
  };

  // 1. request video
  const { data: res1 } = await axios.post(
    BASE + ENDPOINTS.videos,
    payload,
    { headers: { ...UA, authorization: token, 'content-type': 'application/json' } }
  );
  if (res1.code !== 0 || !res1.key) throw new Error('Gagal mendapatkan key video');

  // 2. polling hasil
  const max = 100;
  const delay = 2000;
  for (let i = 0; i < max; i++) {
    const { data: res2 } = await axios.post(
      BASE + ENDPOINTS.videosBatch,
      { keys: [res1.key] },
      { headers: { ...UA, authorization: token, 'content-type': 'application/json' } }
    );
    if (res2.code === 0 && res2.datas?.length) {
      const v = res2.datas[0];
      if (v.url) return v; // selesai
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Video masih pending terlalu lama');
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get('prompt')?.trim();
  if (!prompt) return NextResponse.json({ succes: false, creator: "Ahzamycode", error: '?prompt= required', code: 400 }, { status: 400 });

  if (!/^[a-zA-Z0-9\s.,!?'-]+$/.test(prompt))
    return NextResponse.json({ status: false, creator: "Ahzamycode", error: 'Prompt mengandung karakter tidak diizinkan', code: 400 }, { status: 400 });

  try {
    const result = await generateVideo(prompt);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Upstream error', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'prompt required', code: 400 }, { status: 400 });

  if (!/^[a-zA-Z0-9\s.,!?'-]+$/.test(prompt))
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'Prompt mengandung karakter tidak diizinkan', code: 400 }, { status: 400 });

  try {
    const result = await generateVideo(prompt);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Upstream error', code: 500 }, { status: 500 });
  }
}