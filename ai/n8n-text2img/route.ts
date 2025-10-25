/*  CR: AhzamyCode
    Endpoint: /api/ai/n8n-text2img
    Desc   : Generate image via n8n cloud webhook
*/
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const WEBHOOK = 'https://internal.users.n8n.cloud/webhook/ai_image_generator';

/* ---------- utils ---------- */
const randInt = (max: number) => Math.floor(Math.random() * (max + 1));
const randomIp = () =>
  `${randInt(255)}.${randInt(255)}.${randInt(255)}.${randInt(255)}`;

/* ---------- core ---------- */
async function generateImage(prompt: string) {
  if (!prompt) throw new Error('missing prompt input');

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Zanixon/1.0.0',
      'x-client-ip': randomIp(),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error(`n8n ${res.status} – ${await res.text()}`);

  const json = await res.json();
  if (!json.result) throw new Error('failed generating image');

  return json.result; // array of urls
}

/* ---------- handlers ---------- */
async function handleRequest(req: NextRequest) {
  let prompt = '';
  if (req.method === 'GET') {
    prompt = new URL(req.url).searchParams.get('prompt')?.trim() ?? '';
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      prompt = (body.prompt ?? '').trim();
    } catch {
      /* noop */
    }
  }

  if (!prompt)
    return NextResponse.json(
      { success: false, error: 'Parameter "prompt" wajib diisi' },
      { status: 400 }
    );

  try {
    const images = await generateImage(prompt);
    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: { images, prompt },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[n8n-text2img error]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export const GET  = handleRequest;
export const POST = handleRequest;

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