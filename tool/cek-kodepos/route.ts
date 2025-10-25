/**
 * CR Ahzamycode
 * API: /api/tool/cek-kodepos
 * Desc: Mencari informasi kode pos berdasarkan nama daerah
 * Original scrapper by: Anomaki Team
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * Fungsi utama untuk mencari kode pos
 */
async function cariKodePos(namaDaerah: string): Promise<any> {
  try {
    const response = await axios.post(
      "https://www.nomor.net/_kodepos.php?_i=cari-kodepos&jobs=" + encodeURIComponent(namaDaerah),
      {}, // Body kosong untuk POST
      {
        headers: {
          Referer: "https://www.nomor.net/",
          "Accept-Encoding": "gzip, deflate, br",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    const htmlData: string = response.data;
    const matches = htmlData.matchAll(/class="ktw" title="(?:.+?)" rel="nofollow">(.+?)<\/a>/g);
    const extractedData = Array.from(matches);
    const elements = extractedData.map(match => match[1].replaceAll(/<\/?b>/g, '')).slice(0, 5);

    if (elements.length !== 5) {
      throw new Error(`Tidak ditemukan hasil untuk pencarian kode pos: ${namaDaerah}`);
    }

    const kodeWilayah = htmlData.match(/class="ktw" rel="nofollow">(.+?)<\/a>/)?.[1];

    const result = {
      kodePost: elements[0],
      desa: elements[1],
      kecamatan: elements[2],
      kabupaten: elements[3],
      provinsi: elements[4],
      kodeWilayah,
    };

    return result;
  } catch (error: any) {
    console.error("Error in cariKodePos:", error.message);
    throw new Error(error.message || "Gagal mengambil data kode pos.");
  }
}

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

    const data = await cariKodePos(query);

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: data,
    });

  } catch (err: any) {
    console.error("Error in /api/tool/cek-kodepos:", err);
    // Jika error adalah "tidak ditemukan", kembalikan status 404
    const statusCode = err.message.includes("Tidak ditemukan") ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mencari kode pos",
      },
      { status: statusCode }
    );
  }
}