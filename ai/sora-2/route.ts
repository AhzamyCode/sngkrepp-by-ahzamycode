/**
 * CR Ahzamycode
 * Endpoint: /api/ai/sora-2
 * Generate video text-to-video pakai SORA-2 (bylo.ai)
 * Secure & Anti-block version
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BASE_URL = 'https://api.bylo.ai/aimodels/api/v1/ai';

function randomUA() {
  const uas = [
    'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.90 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

/**
 * Helper: Retry handler buat request yang sering 403 / 404
 */
async function safeRequest<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`[SORA2] Retrying request... (${3 - retries + 1})`);
      await new Promise((res) => setTimeout(res, 1500));
      return safeRequest(fn, retries - 1);
    }
    throw err;
  }
}

/**
 * Create Sora Video
 */
async function createSoraVideo(prompt: string, ratio: 'portrait' | 'landscape' = 'portrait') {
  if (!prompt) throw new Error('prompt required');
  if (!['portrait', 'landscape'].includes(ratio))
    throw new Error('Available ratios: portrait, landscape');

  const HEADERS = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json; charset=UTF-8',
    origin: 'https://bylo.ai',
    referer: 'https://bylo.ai/features/sora-2',
    'user-agent': randomUA(),
    'x-requested-with': 'XMLHttpRequest',
    uniqueId: crypto.randomUUID().replace(/-/g, ''),
    connection: 'keep-alive',
  };

  const api = axios.create({
    baseURL: BASE_URL,
    headers: HEADERS,
    timeout: 180000,
  });

  // 1️⃣ Buat task baru
  const { data: task } = await safeRequest(() =>
    api.post('/video/create', {
      prompt,
      channel: 'SORA2',
      pageId: 536,
      source: 'bylo.ai',
      watermarkFlag: true,
      privateFlag: true,
      isTemp: true,
      vipFlag: true,
      model: 'sora_video2',
      videoType: 'text-to-video',
      aspectRatio: ratio,
    })
  );

  const taskId = task?.data;
  if (!taskId || typeof taskId !== 'string') {
    console.error('[SORA2] Invalid task response:', task);
    throw new Error('Invalid task response from SORA2 API');
  }

  console.log(`[SORA2] Task created: ${taskId}, polling...`);

  // 2️⃣ Polling sampai selesai
  for (let i = 0; i < 180; i++) {
    const { data } = await safeRequest(() => api.get(`/${taskId}?channel=SORA2`));
    if (data?.data?.state > 0) {
      console.log('[SORA2] Task complete.');
      return JSON.parse(data.data.completeData);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  throw new Error('SORA2: Timeout waiting for result');
}

/* ---------- Next.js Handlers ---------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt')?.trim();
  const ratio = (searchParams.get('ratio') as 'portrait' | 'landscape') || 'portrait';

  if (!prompt)
    return NextResponse.json({ success: false, error: '?prompt= required' }, { status: 400 });

  try {
    const data = await createSoraVideo(prompt, ratio);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[SORA2] Error:', err.message);
    console.error('[SORA2] Full error:', err.response?.data || err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, ratio = 'portrait' } = body;

    if (!prompt)
      return NextResponse.json({ success: false, error: 'prompt required' }, { status: 400 });

    const data = await createSoraVideo(prompt, ratio);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[SORA2] Error:', err.message);
    console.error('[SORA2] Full error:', err.response?.data || err);
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 });
  }
}