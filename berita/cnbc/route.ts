/**
 * CR AhzamyCode
 * Endpoint: /api/berita/cnbc
 * Desc: Scrape berita terbaru dari CNBC Indonesia
 */

import { NextRequest, NextResponse } from "next/server";
import got from "got";
import * as cheerio from "cheerio";

async function scrapeCNBCIndonesiaNews() {
  try {
    const response = await got("https://www.cnbcindonesia.com/news", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
      },
      timeout: { request: 30000 },
      retry: {
        limit: 3,
        methods: ["GET"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        errorCodes: [
          "ETIMEDOUT",
          "ECONNRESET",
          "EADDRINUSE",
          "ECONNREFUSED",
          "EPIPE",
          "ENOTFOUND",
          "ENETUNREACH",
          "EAI_AGAIN",
        ],
        calculateDelay: ({ attemptCount }) =>
          Math.min(1000 * Math.pow(2, attemptCount), 10000),
      },
    });

    const $ = cheerio.load(response.body);
    const results: any[] = [];

    $("article").each((_, element) => {
      const $article = $(element);
      const $link = $article.find("a");

      const link = $link.attr("href");
      const image = $link.find("img").attr("src");
      const category =
        $link.find("span.text-cnbc-support-orange").text().trim() || "";
      const title = $link.find("h2").text().trim();
      const label = $link.find("span.bg-cnbc-primary-blue").text().trim();
      const date = $link.find("span.text-gray").text().trim();

      if (title && link) {
        results.push({
          title,
          link,
          image: image || "",
          category: category.replace("Video", "").trim(),
          label: label.replace(/\s+/g, " ").trim(),
          date: date.replace(/\s+/g, " ").trim(),
          type: category.toLowerCase().includes("video") ? "video" : "article",
        });
      }
    });

    return results;
  } catch (error: any) {
    console.error("Error scraping CNBC Indonesia News:", error);
    throw new Error(error.message || "Failed to scrape CNBC Indonesia News");
  }
}

async function handleRequest() {
  const data = await scrapeCNBCIndonesiaNews();
  return NextResponse.json({
    success: true,
    creator: "Ahzamycode",
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleRequest();
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleRequest();
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
