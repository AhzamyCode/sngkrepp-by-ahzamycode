import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

async function FbDownloader(url: string) {
  try {
    const res = await axios.post(
      "https://fbdownloader.to/api/ajaxSearch",
      new URLSearchParams({
        p: "home",
        q: url,
        lang: "id",
        v: "v2",
        w: ""
      }),
      {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://fbdownloader.to",
          referer: "https://fbdownloader.to/id",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
        },
      }
    );

    const html = res.data.data;
    const $ = cheerio.load(html);

    const thumbnail = $(".thumbnail img").attr("src") || null;
    const title = $(".content .clearfix").text().trim() || null;

    let results: { quality: string; link: string }[] = [];
    $(".table tr").each((i, el) => {
      const quality = $(el).find(".video-quality").text().trim();
      const link = $(el).find("a.download-link-fb").attr("href");
      if (quality && link) {
        results.push({ quality, link });
      }
    });

    return {
      success: true,
      creator: "Ahzamycode",
      title,
      thumbnail,
      downloads: results,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || "Scrape error",
    };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Parameter `url` wajib diisi" },
      { status: 400 }
    );
  }

  const data = await FbDownloader(url);
  return NextResponse.json(data);
}
