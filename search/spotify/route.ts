import { NextRequest, NextResponse } from "next/server";
import { scrapeSpotifySearch } from "./search-spcrp";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Parameter 'query' wajib diisi" },
        { status: 400 }
      );
    }

    const results = await scrapeSpotifySearch(query.trim());

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: results,
    });
  } catch (err: any) {
    console.error("Error in /api/search/spotify:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mencari di Spotify",
      },
      { status: 500 }
    );
  }
}
