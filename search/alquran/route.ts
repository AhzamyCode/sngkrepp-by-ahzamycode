/**
 * CR AhzamyCode
 * Endpoint: /api/search/alquran
 * Desc: Cari informasi surah Al-Qur'an berdasarkan nomor, nama latin, atau kata kunci.
 */

import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.npoint.io/99c279bb173a6e28359c/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();

  if (!query)
    return NextResponse.json(
      { success: false, error: "Parameter 'query' wajib diisi" },
      { status: 400 }
    );

  try {
    const res = await fetch(API_URL, { next: { revalidate: 86400 } }); // cache 1 hari
    if (!res.ok) throw new Error("Gagal mengambil data");

    const data: any[] = await res.json();

    const lowerQ = query.toLowerCase();
    const filtered = data.filter(
      (s) =>
        s.nomor === lowerQ ||
        s.nama.toLowerCase().includes(lowerQ) ||
        s.arti.toLowerCase().includes(lowerQ) ||
        s.asma.toLowerCase().includes(lowerQ)
    );

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: filtered,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}