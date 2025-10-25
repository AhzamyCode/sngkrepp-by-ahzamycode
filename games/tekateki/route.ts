// app/api/games/tekateki/route.ts
import { NextResponse } from 'next/server';

const RAW_URL = 'https://raw.githubusercontent.com/BochilTeam/database/master/games/tekateki.json';

async function getRandom(): Promise<{ soal: string; jawaban: string }> {
  const res = await fetch(RAW_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 3600 }, // cache 1 jam
  });
  if (!res.ok) throw new Error('Gagal mengambil data');
  const arr = await res.json();
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET() {
  try {
    const data = await getRandom();
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 });
  }
}