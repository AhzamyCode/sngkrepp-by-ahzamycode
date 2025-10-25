/**
 * CR Ahzamycode
 * API: /api/image/text2img
 * Desc: Generate image dari teks (Text To Image) menggunakan linangdata + upload ke Uguu
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";

// daftar preset gaya gambar
const presets = [
  "none", "anime", "cinematic", "digital-art", "fantasy-art", "pixel-art",
  "photographic", "retro-game", "surrealist", "watercolor"
];

// daftar ukuran
const sizes: Record<string, string> = {
  square: "1024x1024",
  portrait: "768x1024",
  landscape: "1024x768",
  widescreen: "1280x720",
  ultra: "1536x1536",
};

// upload file ke uguu.se
async function uploadUguu(filePath: string): Promise<string> {
  const form = new FormData();
  form.append("files[]", fs.createReadStream(filePath));
  const res = await fetch("https://uguu.se/upload", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  const data: any = await res.json();
  return Array.isArray(data) ? data[0].url : data.files?.[0];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt");
    const negativePrompt = searchParams.get("negativePrompt") || "";
    const preset = searchParams.get("preset") || "anime";
    const orientation = searchParams.get("orientation") || "portrait";
    const seed = searchParams.get("seed") || "";

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Parameter 'prompt' wajib diisi" },
        { status: 400 }
      );
    }

    if (!presets.includes(preset)) {
      return NextResponse.json(
        { success: false, error: `Preset tidak valid. Pilih salah satu: ${presets.join(", ")}` },
        { status: 400 }
      );
    }

    if (!sizes[orientation]) {
      return NextResponse.json(
        { success: false, error: `Orientation tidak valid. Pilih salah satu: ${Object.keys(sizes).join(", ")}` },
        { status: 400 }
      );
    }

    // kirim request ke linangdata
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("negativePrompt", negativePrompt);
    form.append("preset", preset);
    form.append("orientation", orientation);
    form.append("seed", seed);

    const res = await axios.post(
      "https://linangdata.com/text-to-image-ai/stablefusion-v2.php",
      form,
      {
        headers: {
          ...form.getHeaders(),
          accept: "application/json, text/plain, */*",
          "x-requested-with": "XMLHttpRequest",
          referer: "https://linangdata.com/text-to-image-ai/",
        },
      }
    );

    const { filename, image } = res.data || {};
    if (!image) {
      return NextResponse.json(
        { success: false, error: "Response tidak berisi gambar" },
        { status: 500 }
      );
    }

    // decode base64 jadi file sementara
    const buffer = Buffer.from(image, "base64");
    const filePath = path.join(process.cwd(), filename || `linang_${Date.now()}.png`);
    fs.writeFileSync(filePath, buffer);

    // upload ke uguu
    const url = await uploadUguu(filePath);

    // hapus file sementara
    fs.unlinkSync(filePath);

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: {
        url,
        preset,
        size: sizes[orientation],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        creator: "Ahzamycode",
        error: err.message || "Terjadi kesalahan",
        details: err?.response?.data || "",
      },
      { status: 500 }
    );
  }
}
