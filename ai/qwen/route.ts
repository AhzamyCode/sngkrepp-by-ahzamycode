import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const MODEL_ID = '25869'; // qwen
const PROXY_BASE = 'https://px.nekolabs.my.id/';

/* (getNonce & handler sama, ganti nama fungsi saja) */
async function getNonce(): Promise<string> {
  const { data: html } = await axios.post(
    PROXY_BASE + encodeURIComponent('https://chatgptfree.ai/'),
    {},
    { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36' } }
  );
  const m = html.data.content.match(/&quot;nonce&quot;\s*:\s*&quot;([^&]+)&quot;/);
  if (!m) throw new Error('Nonce not found');
  return m[1];
}

async function qwen(prompt: string) {
  const nonce = await getNonce();
  const { data } = await axios.post(
    PROXY_BASE + encodeURIComponent('https://chatgptfree.ai/wp-admin/admin-ajax.php'),
    new URLSearchParams({
      action: 'aipkit_frontend_chat_message',
      _ajax_nonce: nonce,
      bot_id: MODEL_ID,
      session_id: uuidv4(),
      conversation_uuid: uuidv4(),
      post_id: '6',
      message: prompt,
    }).toString(),
    {
      headers: {
        origin: 'https://chatgptfree.ai',
        referer: 'https://chatgptfree.ai/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
      },
    }
  );
  return data.data.content.data.reply;
}

export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get('prompt')?.trim();
  if (!prompt) return NextResponse.json({ success: false, error: '?prompt= required', code: 400 }, { status: 400 });
  try {
    const reply = await qwen(prompt);
    return NextResponse.json({ success: true, data: { reply, model: 'qwen' }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ success: false, error: 'prompt required', code: 400 }, { status: 400 });
  try {
    const reply = await qwen(prompt);
    return NextResponse.json({ success: true, data: { reply, model: 'qwen' }, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, code: 500 }, { status: 500 });
  }
}