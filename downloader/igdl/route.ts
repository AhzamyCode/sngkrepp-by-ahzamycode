import { NextResponse } from "next/server";

function randomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

async function getToken() {
  const res = await fetch("https://gramfetchr.com/", {
    method: "POST",
    headers: {
      "accept": "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": "00d6c3101978ea75ab0e1c4879ef0c686242515660",
      "next-router-state-tree":
        "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D",
      Referer: "https://gramfetchr.com/",
    },
    body: "[]",
  });
  const text = await res.text();
  const tokenMatch = text.match(/"([a-f0-9]{32}:[a-f0-9]{32})"/);
  if (!tokenMatch) throw new Error("Gagal ambil token");
  return tokenMatch[1];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ success: false, error: "URL tidak ditemukan" }, { status: 400 });
  }

  try {
    const token = await getToken();
    const res = await fetch("https://gramfetchr.com/api/fetchr", {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        Referer: "https://gramfetchr.com/",
      },
      body: JSON.stringify({
        url,
        token,
        referer: "https://gramfetchr.com/",
        requester: randomIP(),
      }),
    });

    const json = await res.json();
    if (!json.success || !json.mediaItems) throw new Error("Gagal ambil data");

    const data = json.mediaItems.map((m: any, i: number) => ({
      index: i + 1,
      type: m.isVideo ? "video" : "image",
      download: "https://gramfetchr.com" + m.downloadLink,
      preview: "https://gramfetchr.com" + m.preview,
      thumbnail: "https://gramfetchr.com" + m.thumbnail,
    }));

    return NextResponse.json({ success: true, creator: "Ahzamycode", author: "Ahzamycode", data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "Terjadi error" },
      { status: 500 }
    );
  }
}
