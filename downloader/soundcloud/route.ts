// src/app/api/soundcloud/route.ts
import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Parameter 'url' wajib diisi" },
      { status: 400 }
    );
  }

  try {
    // Request pertama (ambil metadata dan progressive URL)
    const res1 = await axios.post(
      "https://sc.snapfirecdn.com/soundcloud",
      { target: url, gsc: "x" },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://soundcloudaud.com",
          referer: "https://soundcloudaud.com/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        },
      }
    );

    const meta = res1.data.metadata;
    const sound = res1.data.sound;
    const progressive = sound.progressive_url;

    // Request kedua (ambil link download real)
    const res2 = await axios.get(
      `https://sc.snapfirecdn.com/soundcloud-get-dl?target=${encodeURIComponent(progressive)}`,
      {
        headers: {
          accept: "*/*",
          origin: "https://soundcloudaud.com",
          referer: "https://soundcloudaud.com/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        },
      }
    );

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: {
        title: sound.title,
        artist: meta.username,
        artwork: meta.artwork_url,
        profile: meta.profile_picture_url,
        audio: res2.data.url,
      },
    });
  } catch (e: any) {
    console.error("Error SoundCloud:", e.message);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data SoundCloud" },
      { status: 500 }
    );
  }
}
