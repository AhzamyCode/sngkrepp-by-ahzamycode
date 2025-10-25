/**
 * CR Ahzamycode
 * API: /api/tool/shorturl
 * Desc: Membuat URL pendek menggunakan layanan Short Abella (scrape)
 * Original scrapper by: Anomaki Team (xyzan code)
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Parameter 'url' wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi URL dasar
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Format URL tidak valid" },
        { status: 400 }
      );
    }

    // --- Mulai Logika Scraper ---
    const response = await axios.post(
      'https://short.abella.icu/api/shorten',
      { url: url }, // Data yang dikirim
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://short.abella.icu/'
        },
        // Properti 'compress' sudah tidak diperlukan di axios versi modern
      }
    );
    
    const result = response.data;

    // --- Akhir Logika Scraper ---

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: result,
    });

  } catch (err: any) {
    console.error("Error in /api/tool/shorturl:", err);
    
    // Tangani error dari axios secara spesifik
    if (err.response) {
      // Server merespons dengan status code di luar 2xx
      return NextResponse.json(
        {
          success: false,
          error: `Server shortener merespons dengan error: ${err.response.status}`,
          details: err.response.data,
        },
        { status: err.response.status || 500 }
      );
    } else if (err.request) {
      // Request dibuat tapi tidak ada respons
      return NextResponse.json(
        { success: false, error: "Tidak dapat terhubung ke server shortener. Layanan mungkin sedang sibuk atau down." },
        { status: 503 } // Service Unavailable
      );
    } else {
      // Error lainnya
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Terjadi kesalahan yang tidak diketahui",
        },
        { status: 500 }
      );
    }
  }
}