// app/api/downloader/ttdl/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ success: false, error: "URL parameter is required" }, { status: 400 });
  }

  // Validasi TikTok URL
  if (!url.includes("tiktok.com/") && !url.includes("vt.tiktok.com/")) {
    return NextResponse.json({ success: false, error: "Invalid TikTok URL" }, { status: 400 });
  }

  try {
    // Gunakan TikWM API yang lebih stabil
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.tikwm.com/",
        "Origin": "https://www.tikwm.com"
      },
      signal: AbortSignal.timeout(15000) // 15 detik timeout
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Validasi response
    if (data.code !== 0 || !data.data) {
      throw new Error(data.msg || "Failed to download TikTok video");
    }

    // Format response
    const result = {
      id: data.data.id || "",
      title: data.data.title || "TikTok Video",
      author: {
        unique_id: data.data.author?.unique_id || "",
        nickname: data.data.author?.nickname || "",
      },
      download: {
        no_watermark: data.data.play || "",
        with_watermark: data.data.wmplay || "",
        hd: data.data.hdplay || ""
      },
      cover: data.data.cover || "",
      music: data.data.music || "",
      duration: data.data.duration || 0,
      play_count: data.data.play_count || 0,
      digg_count: data.data.digg_count || 0,
      comment_count: data.data.comment_count || 0,
      share_count: data.data.share_count || 0,
      create_time: data.data.create_time || 0
    };

    return NextResponse.json({ 
      success: true, 
      creator: "Ahzamycode", 
      data: result 
    });
    
  } catch (e: any) {
    console.error("TikTok download error:", e);
    
    // Fallback ke metode alternatif jika TikWM gagal
    try {
      return await fallbackTikTokDownload(url);
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
      
      return NextResponse.json(
        { 
          success: false, 
          error: e.message || "Failed to download TikTok video",
          debug: {
            timestamp: new Date().toISOString(),
            endpoint: "/api/downloader/ttdl",
            errorDetails: e.stack,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : null
          }
        },
        { status: 500 }
      );
    }
  }
}

// Fallback method menggunakan TikSave
async function fallbackTikTokDownload(url: string) {
  const apiRes = await fetch("https://api.tiksave.app/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Referer": "https://tiksave.app/"
    },
    body: JSON.stringify({
      url: url
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!apiRes.ok) {
    throw new Error(`Fallback API failed with status ${apiRes.status}`);
  }

  const data = await apiRes.json();
  
  if (!data.success || !data.data) {
    throw new Error(data.message || "Fallback method failed");
  }

  const result = {
    id: data.data.id || "",
    title: data.data.title || "TikTok Video",
    author: {
      unique_id: data.data.author?.unique_id || "",
      nickname: data.data.author?.nickname || "",
    },
    download: {
      no_watermark: data.data.no_watermark || "",
      with_watermark: data.data.with_watermark || "",
    },
    cover: data.data.cover || "",
    music: data.data.music || "",
  };

  return NextResponse.json({ 
    success: true, 
    creator: "Ahzamycode",
    data: result 
  });
}