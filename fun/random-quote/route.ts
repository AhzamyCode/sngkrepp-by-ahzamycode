/**
 * CR Ahzamycode
 * API: /api/fun/random-quote
 * Desc: Mengambil sebuah kutipan (quote) secara acak dari kumpulan kutipan
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    // Mengambil data dari API eksternal
    const response = await axios.get('https://api.npoint.io/b19365077c38660b93fb');
    const quotes = response.data;

    // Validasi apakah data yang didapat adalah array dan tidak kosong
    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error("Data kutipan dari API eksternal tidak valid atau kosong.");
    }

    // Memilih indeks acak dari array kutipan
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: randomQuote,
    });

  } catch (err: any) {
    console.error("Error in /api/fun/random-quote:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mengambil kutipan acak.",
      },
      { status: 500 }
    );
  }
}