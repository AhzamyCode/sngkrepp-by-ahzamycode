/**
 * CR AhzamyCode
 * Endpoint: /api/search/pinterest
 * Desc: Scraper Pinterest untuk hasil gambar, video, dan gif.
 */

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

class PinterestScraper {
  private baseUrl: string
  private headers: Record<string, string>

  constructor() {
    this.baseUrl = "https://id.pinterest.com/resource/BaseSearchResource/get/"
    this.headers = {
      "authority": "id.pinterest.com",
      "accept": "application/json, text/javascript, */*;q=0.01",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/x-www-form-urlencoded",
      "cookie":
        "csrftoken=c6c1ae81f3fa623853339b4174673ad8; _pinterest_sess=TWc9PSYvZ2RGcU1Ra2FweVMxb3p5MUI0L2lQcXhsbGNUS2xib21KalZWOG0wazFBQmdmRW9aOGk5MGtYMzRmWlRSUCtkcjFjMlIxRXVNRGxNZDQ4Q0JvVFJiUVNZK2JmeEZsczJ2UklWdC9kKzFuYz0mWVFpMVVDQ0hSYUExQTBveTZ5ZG1FVTdwN1FjPQ==; _auth=0; _routing_id=\"abd2e5b5-17e4-4fd3-aa85-67640f0c6ff3\"; sessionFunnelEventLogged=1",
      "origin": "https://id.pinterest.com",
      "referer": "https://id.pinterest.com/",
      "screen-dpr": "1.5891023874282837",
      "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\"",
      "sec-ch-ua-full-version-list":
        "\"Not A(Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"132.0.6961.0\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      "x-app-version": "f1222d7",
      "x-csrftoken": "c6c1ae81f3fa623853339b4174673ad8",
      "x-pinterest-appstate": "background",
      "x-pinterest-pws-handler": "www/search/[scope].js",
      "x-requested-with": "XMLHttpRequest",
    }
  }

  private async makeRequest(params: Record<string, any>, isPost: boolean = true) {
    const url = new URL(this.baseUrl)
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

    try {
      const response = isPost
        ? await axios.post(url.toString(), new URLSearchParams(params).toString(), {
            headers: {
              ...this.headers,
              "x-pinterest-source-url": `/search/pins/?q=${encodeURIComponent(params.query)}&rs=typed`,
            },
            responseType: "json",
            decompress: true,
          })
        : await axios.get(this.baseUrl + "?" + new URLSearchParams(params), {
            headers: {
              ...this.headers,
              "x-pinterest-source-url": `/search/pins/?q=${encodeURIComponent(params.query)}&rs=typed`,
              "x-pinterest-appstate": "active",
            },
            responseType: "json",
            decompress: true,
          })

      return response.data
    } catch (error: any) {
      console.error("Error fetching data:", error.message)
      return null
    }
  }

  private formatResults(results: any[]) {
    return results.map((item) => {
      let videoUrl: string | null = null
      if (item.videos?.video_list) {
        const firstVideoKey = Object.keys(item.videos.video_list)[0]
        videoUrl = item.videos.video_list[firstVideoKey]?.url
        if (videoUrl && firstVideoKey.includes("HLS") && videoUrl.includes("m3u8")) {
          videoUrl = videoUrl.replace("hls", "720p").replace("m3u8", "mp4")
        }
      }

      return {
        pin: `https://www.pinterest.com/pin/${item.id ?? ""}`,
        link: item.link ?? null,
        created_at: item.created_at
          ? new Date(item.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "",
        id: item.id ?? "",
        image_url: item.images?.orig?.url ?? null,
        video_url: videoUrl,
        gif_url: item.embed?.src && item.embed?.type === "gif" ? item.embed.src : null,
        grid_title: item.grid_title ?? "",
        description: item.description ?? "",
        type: item.videos ? "video" : item.embed?.type === "gif" ? "gif" : "image",
        pinner: {
          username: item.pinner?.username ?? "",
          full_name: item.pinner?.full_name ?? "",
          follower_count: item.pinner?.follower_count ?? 0,
          image_small_url: item.pinner?.image_small_url ?? "",
        },
        board: {
          id: item.board?.id ?? "",
          name: item.board?.name ?? "",
          url: item.board?.url ?? "",
          pin_count: item.board?.pin_count ?? 0,
        },
        reaction_counts: item.reaction_counts ?? {},
        dominant_color: item.dominant_color ?? "",
        seo_alt_text: item.seo_alt_text ?? item.alt_text ?? "",
      }
    })
  }

  public async scrape(query: string, typeFilter: string | null = null) {
    const initialParams = {
      source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
      data: JSON.stringify({
        options: {
          query,
          rs: "typed",
          scope: "pins",
          redux_normalize_feed: true,
        },
        context: {},
      }),
      query,
      _: Date.now(),
    }

    const firstResponse = await this.makeRequest(initialParams, false)
    if (!firstResponse) return []

    const firstResults = firstResponse.resource_response?.data?.results ?? []
    let allResults = this.formatResults(firstResults)

    const bookmark = firstResponse.resource_response?.bookmark
    if (bookmark) {
      const nextParams = {
        ...initialParams,
        data: JSON.stringify({
          options: {
            ...JSON.parse(initialParams.data).options,
            bookmarks: [bookmark],
          },
          context: {},
        }),
      }

      const secondResponse = await this.makeRequest(nextParams)
      if (secondResponse && secondResponse.resource_response?.data?.results) {
        const secondResults = this.formatResults(secondResponse.resource_response.data.results)
        allResults = [...allResults, ...secondResults]
      }
    }

    if (typeFilter) {
      allResults = allResults.filter((result) => result.type === typeFilter)
    }

    return allResults
  }
}

const scraper = new PinterestScraper()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")
  const type = searchParams.get("type")

  if (!query)
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Query parameter is required" }, { status: 400 })

  if (type && !["image", "video", "gif"].includes(type))
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Invalid type parameter" }, { status: 400 })

  try {
    const result = await scraper.scrape(query.trim(), type ? type.trim().toLowerCase() : null)
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const query = body?.query
  const type = body?.type

  if (!query)
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Query parameter is required" }, { status: 400 })

  if (type && !["image", "video", "gif"].includes(type))
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Invalid type parameter" }, { status: 400 })

  try {
    const result = await scraper.scrape(query.trim(), type ? type.trim().toLowerCase() : null)
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}
