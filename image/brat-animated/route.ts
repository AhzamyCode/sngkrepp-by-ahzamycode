import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json(
      { success: false, error: "Param 'text' wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://zelapioffciall.koyeb.app/imagecreator/bratvid?text=${encodeURIComponent(text)}`
    );

    if (!res.ok) {
      throw new Error(`Request gagal dengan status ${res.status}`);
    }

    // Ambil content-type dari Hazel API
    const contentType = res.headers.get("content-type") || "image/webp";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="brat.webp"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Gagal generate brat stiker", details: err.message },
      { status: 500 }
    );
  }
}
