import axios from "axios";
import { NextResponse, NextRequest } from "next/server";

async function scrape(query: string) {
  const headers = {
    Accept: "*/*",
    "User-Agent": "Postify/1.0.0",
    "Content-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
  };

  const payload = {
    query,
    search_uuid: Date.now().toString(),
    search_options: { langcode: "id-MM" },
    search_video: true,
  };

  const request = (badi: string) => {
    const result = { answer: "", source: [] as any[] };
    badi.split("\n").forEach((line) => {
      if (line.startsWith("data:")) {
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.data) {
            if (data.data.text) result.answer = data.data.text.replace(/\d+/g, "");
            if (data.data.sources) result.source = data.data.sources;
          }
        } catch {}
      }
    });
    return result;
  };

  const res = await axios.post("https://api.felo.ai/search/threads", payload, {
    headers,
    timeout: 30000,
    responseType: "text",
  });

  return request(res.data);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ status: false, error: "Query parameter is required", code: 400 }, { status: 400 });

  try {
    const result = await scrape(query);
    return NextResponse.json({ status: true, data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ status: false, error: err.message || "Internal Server Error", code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = body?.query?.trim();
  if (!query) return NextResponse.json({ status: false, error: "Query parameter is required", code: 400 }, { status: 400 });

  try {
    const result = await scrape(query);
    return NextResponse.json({ status: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ status: false, error: err.message || "Internal Server Error", code: 500 }, { status: 500 });
  }
}
