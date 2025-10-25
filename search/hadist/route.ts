/**
 * CR AhzamyCode
 * Endpoint: /api/search/hadist
 * Desc: Scraper Hadits dari hadits.id
 */

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import * as cheerio from "cheerio"

class HadistScraper {
  private baseUrl = "https://www.hadits.id"

  /* ---------- Helper: fetch & load ---------- */
  private async fetchHTML(path: string) {
    const { data } = await axios.get(`${this.baseUrl}${path}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      },
    })
    return cheerio.load(data)
  }

  /* ---------- 1. Search by keyword ---------- */
  public async search(keyword: string) {
    const $ = await this.fetchHTML(`/tentang/${encodeURIComponent(keyword)}`)
    const results: Array<{ hadistriwayat: string; title: string; fullurl: string }> = []

    $("section").each((_, el) => {
      const hadistriwayat = $(el).find("span").first().text().trim()
      const title = $(el).find("a").first().text().trim()
      const href = $(el).find("a").first().attr("href")
      if (href) {
        results.push({ hadistriwayat, title, fullurl: this.baseUrl + href })
      }
    })

    return results
  }

  /* ---------- 2. Get full content by URL ---------- */
  public async getFull(url: string) {
    const $ = await this.fetchHTML(new URL(url).pathname)
    const title = $("h1").first().text().trim()
    const hadist = $("p").eq(6).text().trim() + "\n" + $("p").eq(7).text().trim()
    return { title, hadist }
  }

  /* ---------- 3. Random hadits ---------- */
  public async randomHadits() {
    const list = ["bukhari", "nasai", "muslim", "tirmidzi", "dawud", "majah"]
    const randomBook = list[Math.floor(Math.random() * list.length)]
    const randomNumber = Math.floor(Math.random() * 2000) + 1
    return this.getFull(`${this.baseUrl}/hadits/${randomBook}/${randomNumber}`)
  }
}

const scraper = new HadistScraper()

/* -------------------------------------------------
   Route Handler
------------------------------------------------- */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")?.trim()
  const url = searchParams.get("url")?.trim()
  const random = searchParams.has("random")

  try {
    if (random) {
      const data = await scraper.randomHadits()
      return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
    }

    if (url) {
      const data = await scraper.getFull(url)
      return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
    }

    if (!query) {
      return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Missing parameter: query, url, or random" }, { status: 400 })
    }

    const data = await scraper.search(query)
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { query, url, random } = body

  try {
    if (random) {
      const data = await scraper.randomHadits()
      return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
    }

    if (url) {
      const data = await scraper.getFull(url)
      return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
    }

    if (!query) {
      return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Missing parameter: query, url, or random" }, { status: 400 })
    }

    const data = await scraper.search(query.trim())
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}