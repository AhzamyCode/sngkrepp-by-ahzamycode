/**
 * CR Ahzamycode
 * Handler untuk /api/ai/ss-to-code
 * Upload file / URL → WebSocket → HTML+Tailwind code
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const WS_URL = 'wss://imagetoappv2.ngrok.app/generate-code';

/* ---------- dynamic import ws ---------- */
let wsModule: any;
const loadWS = async () => {
  if (!wsModule) wsModule = await import('ws');
  return wsModule.WebSocket;
};

async function wsConvert(buffer: Buffer): Promise<string> {
  const WebSocket = await loadWS();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let finalCode = '';

    ws.on('open', () => {
      ws.send(JSON.stringify({
        generationType: 'create',
        image: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        inputMode: 'image',
        openAiApiKey: null,
        openAiBaseURL: null,
        anthropicApiKey: null,
        screenshotOneApiKey: null,
        isImageGenerationEnabled: true,
        editorTheme: 'cobalt',
        generatedCodeConfig: 'html_tailwind',
        codeGenerationModel: 'gpt-4o-2024-05-13',
        isTermOfServiceAccepted: false,
      }));
    });

    ws.on('message', (msg: Buffer) => {
      const res = JSON.parse(msg.toString());
      if (res.type === 'setCode') finalCode = res.value;
      else if (res.type === 'status') console.log('[WS]', res.value);
    });

    ws.on('close', () => resolve(finalCode.trim()));
    ws.on('error', (err: Error) => reject(new Error(err.message)));
  });
}

async function proc(buffer: Buffer) {
  if (buffer.length > 5 * 1024 * 1024) throw new Error('Max 5 MB');
  return await wsConvert(buffer);
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const u = new URL(req.url).searchParams.get('imageUrl');
  if (!u) return NextResponse.json({ success: false, error: '?imageUrl= required' }, { status: 400 });
  try {
    const { data } = await axios.get(u, { responseType: 'arraybuffer' });
    const code = await proc(Buffer.from(data));
    return NextResponse.json({ success: true, data: { code }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  try {
    let buf: Buffer;
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const f = fd.get('image') as File | null;
      if (!f) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'field "image" required' }, { status: 400 });
      buf = Buffer.from(await f.arrayBuffer());
    } else if (ct.includes('application/json')) {
      const b = await req.json();
      const u = b.imageUrl;
      if (!u) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'imageUrl required' }, { status: 400 });
      const { data } = await axios.get(u, { responseType: 'arraybuffer' });
      buf = Buffer.from(data);
    } else {
      return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'Content-Type harus multipart/form-data atau application/json' }, { status: 400 });
    }
    const code = await proc(buf);
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: { code }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message }, { status: 500 });
  }
}