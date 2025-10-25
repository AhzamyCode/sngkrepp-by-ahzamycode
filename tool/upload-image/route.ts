// app/api/tool/upload-image/route.ts

import { NextRequest, NextResponse } from "next/server";
import { uploadToUguu } from "@/lib/uguu";

// *** HAPUS KONFIGURASI INI, NGGAK PERLU LAGI DI APP ROUTER ***
// export const config = {
//   api: { bodyParser: false },
// };

export async function POST(req: NextRequest) {
  try {
    // *** CARA BARU: AMBIL FORM DATA LANGSUNG DARI REQUEST ***
    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    // Validasi: Pastikan file-nya ada
    if (!image) {
      return NextResponse.json(
        { success: false, error: "File gambar wajib diupload dengan key 'image'." },
        { status: 400 }
      );
    }

    // *** LANGSUNG KIRIM FILE OBJECT KE HELPER FUNCTION ***
    const url = await uploadToUguu(image);

    // *** NGGAK PERLU LAGI HAPUS FILE KARNA KITA NGGAK NYIMPAN KE DISK ***
    // fs.unlinkSync(data.filePath); // <-- HAPUS BARIS INI

    return NextResponse.json({
      success: true,
      data: { url },
      author: "Ahzamycode",
    });
  } catch (err: any) {
    console.error("[Upload Image Error]", err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mengupload gambar.",
      },
      { status: 500 }
    );
  }
}