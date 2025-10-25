/**
 * CR Ahzamycode
 * API: /api/downloader/twitter
 * Desc: Download video dari Twitter menggunakan SnapTwitter (scrape)
 * Original scrapper by: Anomaki Team
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { URLSearchParams } from "url";

/**
 * Fungsi inti untuk mengunduh video dari Twitter
 */
async function scrapeTwitter(videoUrl: string): Promise<any> {
  const apiUrl = "https://snaptwitter.com/action.php";
  try {
    // Langkah 1: Ambil halaman utama untuk mendapatkan token
    const { data: html } = await axios.get("https://snaptwitter.com/");
    const $ = cheerio.load(html);
    const tokenValue = $('input[name="token"]').attr("value");

    if (!tokenValue) {
      throw new Error("Gagal mengambil token dari SnapTwitter.");
    }

    // Langkah 2: Kirim request POST dengan URL video dan token
    const formData = new URLSearchParams();
    formData.append("url", videoUrl);
    formData.append("token", tokenValue);

    const config = {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    };
    const response = await axios.post(apiUrl, formData, config);

    // Langkah 3: Parse HTML respons untuk mendapatkan link unduhan
    const $result = cheerio.load(response.data.data);

    const result = {
      imgUrl: $result(".videotikmate-left img").attr("src"),
      downloadLink: $result(".abuttons a").attr("href"),
      videoTitle: $result(".videotikmate-middle h1").text().trim(),
      videoDescription: $result(".videotikmate-middle p span").text().trim(),
    };

    // Validasi hasil
    if (!result.downloadLink) {
      throw new Error("Tidak dapat menemukan link unduhan. Pastikan URL video valid dan publik.");
    }

    return result;
  } catch (error: any) {
    console.error("Error scraping Twitter:", error.message);
    // Lempar error agar bisa ditangkap oleh handler
    throw new Error(error.message || "Gagal mengunduh video dari Twitter.");
  }
}

// Handler untuk metode GET
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

    const result = await scrapeTwitter(url);

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: result,
    });

  } catch (err: any) {
    console.error("Error in /api/downloader/twitter GET:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat memproses video Twitter",
      },
      { status: 500 }
    );
  }
}

// Handler untuk metode POST
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Parameter 'url' wajib diisi dalam body request" },
        { status: 400 }
      );
    }

    const result = await scrapeTwitter(url);

    return NextResponse.json({
      success: true,
      data: result,
      author: "Ahzamycode",
    });

  } catch (err: any) {
    console.error("Error in /api/downloader/twitter POST:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat memproses video Twitter",
      },
      { status: 500 }
    );
  }
}