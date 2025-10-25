/**
 * Spotify Downloader v2 (With Preview URL)
 * API: /downloader/v2/spotify
 * Desc: Download audio dari Spotify via Spotisaver.net + Spotify Web API
 * Method:
 * - GET: Ambil info dari URL Spotify (track atau playlist) dengan preview_url
 * - POST: Download file audio dari track
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// --- Konfigurasi ---
const SPOTIFY_SCRAPER = "https://spotisaver.net";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
};

// Ambil kredensial dari environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// --- Fungsi Scraper (Spotisaver.net) ---

// 1. Ambil info dasar dari Spotify (track atau playlist) dari spotisaver.net
// Data ini diperlukan untuk proses download
async function getSpotifyInfo(url: string) {
  let id, type, referer;

  if (url.includes("/track/")) {
    id = url.split("/track/")[1]?.split("?")[0];
    type = "track";
    referer = `${SPOTIFY_SCRAPER}/en/track/${id}/`;
  } else if (url.includes("/playlist/")) {
    id = url.split("/playlist/")[1]?.split("?")[0];
    type = "playlist";
    referer = `${SPOTIFY_SCRAPER}/en/playlist/${id}/`;
  } else {
    throw new Error("URL Spotify tidak valid. Harus berupa track atau playlist.");
  }

  const apiUrl = `${SPOTIFY_SCRAPER}/api/get_playlist.php?id=${id}&type=${type}&lang=en`;
  const res = await axios.get(apiUrl, {
    headers: {
      ...HEADERS,
      Referer: referer,
    },
  });

  return res.data?.tracks || [];
}

// 2. Download file audio menggunakan data dari spotisaver.net
async function downloadTrack(track: any) {
  const payload = {
    track,
    download_dir: "downloads",
    filename_tag: "SPOTISAVER",
    user_ip: "2404:c0:9830::800e:2a9c", // IP statis, bisa diganti jika perlu
    is_premium: false,
  };

  const res = await axios.post(`${SPOTIFY_SCRAPER}/api/download_track.php`, payload, {
    headers: {
      ...HEADERS,
      Referer: `${SPOTIFY_SCRAPER}/en/track/${track.id}/`,
    },
    responseType: "arraybuffer",
  });

  return Buffer.from(res.data);
}

// --- Fungsi untuk Spotify Web API (Resmi) ---

// 3. Dapatkan Access Token dari Spotify
async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Kredensial Spotify API (CLIENT_ID/CLIENT_SECRET) tidak ditemukan di .env.local");
  }

  const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

// 4. Dapatkan metadata lengkap (termasuk preview_url) dari Spotify Web API
async function getSpotifyMetadata(trackId: string) {
  const accessToken = await getSpotifyAccessToken();

  const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const track = response.data;
  return {
    name: track.name,
    artists: track.artists.map((a: any) => a.name),
    album: track.album.name,
    image: track.album.images[0],
    id: track.id,
    external_url: track.external_urls.spotify,
    duration_ms: track.duration_ms,
    preview_url: track.preview_url, // Ini yang kita cari!
    release_date: track.album.release_date,
    popularity: track.popularity,
  };
}

// --- API Route Handlers ---

// GET handler: Ambil info dari URL Spotify
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Query ?url= tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!url.includes("open.spotify.com/")) {
      return NextResponse.json(
        { success: false, error: "URL Spotify tidak valid." },
        { status: 400 }
      );
    }

    // Ambil data dari spotisaver.net (untuk keperluan download)
    const spotisaverTracks = await getSpotifyInfo(url);

    if (spotisaverTracks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada track yang ditemukan di URL tersebut." },
        { status: 404 }
      );
    }

    // Jika ini adalah single track, kita ambil metadata lengkap dari Spotify API
    if (url.includes("/track/")) {
      const trackId = spotisaverTracks[0].id;
      const spotifyApiData = await getSpotifyMetadata(trackId);

      // Gabungkan data dari spotisaver (untuk download) dengan data dari Spotify API (untuk metadata)
      // Data dari spotisaver mungkin punya struktur unik yang dibutuhkan untuk download
      const mergedTrack = {
        ...spotisaverTracks[0], // Ambil semua data dari spotisaver
        ...spotifyApiData,      // Timpa dengan data yang lebih lengkap dari Spotify API
      };

      return NextResponse.json({
        success: true,
        creator: "Ahzamycode",
        type: "track",
        data: [mergedTrack],
      });
    }

    // Untuk playlist, kembalikan data dari spotisaver (sudah cukup untuk menampilkan daftar lagu)
    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      type: "playlist",
      data: spotisaverTracks,
    });
  } catch (error: any) {
    console.error("Error in GET /downloader/v2/spotify:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan saat mengambil info dari Spotify.",
      },
      { status: 500 }
    );
  }
}

// POST handler: Download file audio
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { track } = body;

    if (!track || !track.id) {
      return NextResponse.json(
        { success: false, error: "Request body harus memiliki properti 'track' dari hasil GET." },
        { status: 400 }
      );
    }

    const audioBuffer = await downloadTrack(track);

    // Buat nama file yang aman
    const filename = `${track.name || "spotify_track"} - ${track.artists?.[0] || "unknown_artist"}.mp3`
      .replace(/[^a-z0-9\s-]/gi, "")
      .trim();

    // Kembalikan response sebagai file download
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /downloader/v2/spotify:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan saat mendownload lagu.",
      },
      { status: 500 }
    );
  }
}