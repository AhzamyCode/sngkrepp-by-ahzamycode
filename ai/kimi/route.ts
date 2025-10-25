// app/api/ai/kimi/route.ts
/**
 * CR FongsiDev
 * Handler untuk /api/ai/kimi
 * prompt → jawaban streaming Kimi AI
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { randomBytes } from 'crypto';

const BASE = 'https://www.kimi.com/api';
const TOKEN = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc2MjE1OTU0NSwiaWF0IjoxNzU5NTY3NTQ1LCJqdGkiOiJkM2dkdGVlNnM0dDR2cXFnaHFsMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJkM2dkdGVlNnM0dDR2cXFnaHFqZyIsInNwYWNlX2lkIjoiZDNnZHRlNjZzNHQ0dnFxZ2htN2ciLCJhYnN0cmFjdF91c2VyX2lkIjoiZDNnZHRlNjZzNHQ0dnFxZ2htNzAiLCJzc2lkIjoiMTczMTQyOTU0NzY0NTM2MTk3NiIsImRldmljZV9pZCI6Ijc1NTcyODQyNjIwMTQxNDcwODAiLCJyZWdpb24iOiJvdmVyc2VhcyIsIm1lbWJlcnNoaXAiOnsibGV2ZWwiOjEwfX0.CEECs1EyPwYmxdf_NaWGhAbCvV70E_OoaOyrojYGfw72qagasXujNI0Tvg1kYjHqYieeJyCoBMG2xaKwoi9bGg';

let sessionCache: Record<string, string> = {};

function genDeviceId(): string {
  return randomBytes(8).readBigUInt64BE(0).toString();
}

async function createSession(deviceId: string): Promise<string> {
  const { data } = await axios.post(
    `${BASE}/chat`,
    {
      name: 'kevyll-session',
      born_from: 'home',
      kimiplus_id: 'kimi',
      is_example: false,
      source: 'web',
      tags: [],
    },
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        cookie: `kimi-auth=${TOKEN}`,
        'content-type': 'application/json',
        origin: 'https://www.kimi.com',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        'x-language': 'zh-CN',
        'x-msh-device-id': deviceId,
        'x-msh-platform': 'web',
        'x-traffic-id': deviceId,
      },
    }
  );
  return data.id;
}

async function askKimi(prompt: string, deviceId: string, chatId: string): Promise<string> {
  const { data: stream } = await axios.post(
    `${BASE}/chat/${chatId}/completion/stream`,
    {
      kimiplus_id: 'kimi',
      model: 'k2',
      use_search: true,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        cookie: `kimi-auth=${TOKEN}`,
        'content-type': 'application/json',
        origin: 'https://www.kimi.com',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        'x-language': 'zh-CN',
        'x-msh-device-id': deviceId,
        'x-msh-platform': 'web',
        'x-traffic-id': deviceId,
      },
      responseType: 'stream',
    }
  );

  return new Promise((res, rej) => {
    let full = '';
    stream.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.event === 'cmpl' && d.text && d.view === 'cmpl') full += d.text;
            else if (d.event === 'all_done') return res(full);
          } catch {}
        }
      }
    });
    stream.on('error', rej);
  });
}

/* ---------- handler ---------- */
export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get('prompt')?.trim();
  if (!prompt) return NextResponse.json({ success: false, creator: "Ahzamycode", error: '?prompt= required', code: 400 }, { status: 400 });

  const deviceId = genDeviceId();
  const chatId = sessionCache[deviceId] || (sessionCache[deviceId] = await createSession(deviceId));
  try {
    const answer = await askKimi(prompt, deviceId, chatId);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: { answer }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Upstream error', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'prompt required', code: 400 }, { status: 400 });

  const deviceId = genDeviceId();
  const chatId = sessionCache[deviceId] || (sessionCache[deviceId] = await createSession(deviceId));
  try {
    const answer = await askKimi(prompt, deviceId, chatId);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: { answer }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message || 'Upstream error', code: 500 }, { status: 500 });
  }
}