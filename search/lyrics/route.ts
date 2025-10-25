// app/api/search/lyrics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { scrapeLyricsSearch } from "./scrape-lyrics"; // Import fungsi scraping yang baru dibuat

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Gunakan parameter 'query' agar konsisten dengan endpoint lainnya
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Parameter 'query' wajib diisi" },
        { status: 400 }
      );
    }

    // Panggil fungsi scraping dan kirim query-nya
    const results = await scrapeLyricsSearch(query.trim());

    // Return response dengan format yang sama dengan endpoint Spotify
    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: results,
    });
  } catch (err: any) {
    // Log error untuk debugging di server
    console.error("Error in /api/search/lyrics:", err);
    
    // Return response error yang konsisten
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mencari lirik",
      },
      { status: 500 }
    );
  }
}