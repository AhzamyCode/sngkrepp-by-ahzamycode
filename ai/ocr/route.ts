/**
 * CR Ponta Sensei
 * CH https://whatsapp.com/channel/0029VagslooA89MdSX0d1X1z
 * WEB https://codeteam.my.id
 * Adapted for Next.js API Route by Ahzamycode
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import os from "os"

// Fungsi utama untuk memproses OCR
async function processOCR(filePath: string): Promise<{ extractedText: string }> {
  const url = "https://staging-ai-image-ocr-266i.frontend.encr.app/api/ocr/process";

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  // Validasi tipe file
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new Error("Tipe file tidak didukung. Harap unggah file PNG atau JPG.");
  }

  const imageBase64 = fs.readFileSync(filePath).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal memproses OCR: ${errorText}`);
  }

  const json = await res.json();
  return { extractedText: json.extractedText };
}

export async function GET(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('imageUrl');

    // Jika tidak ada parameter imageUrl, kembalikan dokumentasi
    if (!imageUrl) {
      const exampleUsage = { /* ... objek dokumentasi kamu ... */ };
      return NextResponse.json(exampleUsage, { status: 200 });
    }

    // --- JIKA ADA imageUrl, PROSES GAMBAR ---
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Gagal mengambil gambar dari URL. Status: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    console.log(`Memproses gambar dari URL via GET: ${imageUrl}`);

    // Simpan buffer ke file sementara
    const tempDir = os.tmpdir();
    const fileName = `ocr-image-${Date.now()}.jpg`;
    tempFilePath = path.join(tempDir, fileName);
    await writeFile(tempFilePath, buffer);

    // Proses file dengan OCR
    const result = await processOCR(tempFilePath);

    return NextResponse.json({
      success: true,
      data: result,
      author: "Ahzamycode",
    });

  } catch (err: any) {
    console.error("Error in /api/ai/ocr (GET):", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat memproses gambar dari URL.",
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`File sementara ${tempFilePath} berhasil dihapus.`);
      } catch (unlinkError) {
        console.error(`Gagal menghapus file sementara ${tempFilePath}:`, unlinkError);
      }
    }
  }
}


export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    let buffer: Buffer;

    if (file) {
      // --- KASUS 1: User mengunggah file ---
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log(`Memproses file yang diunggah: ${file.name}`);
    } else if (imageUrl) {
      // --- KASUS 2: User memberikan URL gambar ---
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Gagal mengambil gambar dari URL. Status: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      buffer = Buffer.from(imageBuffer);
      console.log(`Memproses gambar dari URL: ${imageUrl}`);
    } else {
      // --- KASUS 3: User tidak memberikan apa-apa ---
      return NextResponse.json(
        { success: false, error: "Harap unggah file gambar atau berikan URL gambar." },
        { status: 400 }
      );
    }

    // Simpan buffer ke file sementara
    const tempDir = os.tmpdir();
    const fileName = file?.name || `ocr-image-${Date.now()}.jpg`;
    tempFilePath = path.join(tempDir, fileName);
    await writeFile(tempFilePath, buffer);

    // Proses file dengan OCR
    const result = await processOCR(tempFilePath);

    return NextResponse.json({
      success: true,
      data: result,
      creator: "Ahzamycode",
    });

  } catch (err: any) {
    console.error("Error in /api/ai/ocr:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat memproses gambar.",
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`File sementara ${tempFilePath} berhasil dihapus.`);
      } catch (unlinkError) {
        console.error(`Gagal menghapus file sementara ${tempFilePath}:`, unlinkError);
      }
    }
  }
}