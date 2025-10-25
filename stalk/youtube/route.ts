import { NextRequest, NextResponse } from "next/server"
import needle from "needle"
import * as cheerio from "cheerio"

async function youtubeStalk(username: string) {
  try {
    const options = {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
      },
      follow_max: 5,
    }

    const response = await needle("get", `https://youtube.com/@${username}`, options)
    const $ = cheerio.load(response.body)

    const ytInitialDataScript = $('script')
      .filter((_, el) => {
        const html = $(el).html()
        return html ? html.includes('var ytInitialData =') : false
      })
      .html()


    const jsonData = ytInitialDataScript?.match(/var ytInitialData = (.*?);/)
    if (!jsonData || !jsonData[1]) throw new Error("Gagal parse YouTube data.")

    const parsedData = JSON.parse(jsonData[1])

    const channelMetadata = {
      username: null,
      name: null,
      subscriberCount: null,
      videoCount: null,
      avatarUrl: null,
      channelUrl: null,
      description: null,
    }

    if (parsedData.header?.pageHeaderRenderer) {
      const header = parsedData.header.pageHeaderRenderer
      channelMetadata.name = header.content?.pageHeaderViewModel?.title?.content
      channelMetadata.username =
        header.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel
          ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content

      const avatarSrc =
        header.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel
          ?.avatar?.avatarViewModel?.image?.sources?.[0]?.url
      if (avatarSrc) channelMetadata.avatarUrl = avatarSrc
    }

    if (parsedData.metadata?.channelMetadataRenderer) {
      const channelMeta = parsedData.metadata.channelMetadataRenderer
      channelMetadata.description = channelMeta.description
      channelMetadata.channelUrl = channelMeta.channelUrl

      const rows =
        parsedData.header?.pageHeaderRenderer?.content?.pageHeaderViewModel
          ?.metadata?.contentMetadataViewModel?.metadataRows
      if (rows?.length > 1) {
        const subsRow = rows[1]
        subsRow.metadataParts.forEach((part: any) => {
          const txt = part.text?.content
          if (!txt) return
          if (txt.includes("subscribers")) channelMetadata.subscriberCount = txt
          else if (txt.includes("videos")) channelMetadata.videoCount = txt
        })
      }
    }

    // ambil 5 video terbaru
    const videoDataList: any[] = []
    const tabs = parsedData.contents?.twoColumnBrowseResultsRenderer?.tabs
    if (tabs?.length > 0) {
      const videosTab =
        tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
      let videoCount = 0

      for (const item of videosTab) {
        if (videoCount >= 5) break
        if (item.itemSectionRenderer) {
          for (const content of item.itemSectionRenderer.contents) {
            if (content.shelfRenderer?.content?.horizontalListRenderer) {
              const items =
                content.shelfRenderer.content.horizontalListRenderer.items
              for (const video of items) {
                if (videoCount >= 5) break
                if (video.gridVideoRenderer) {
                  const v = video.gridVideoRenderer
                  videoDataList.push({
                    videoId: v.videoId,
                    title: v.title?.simpleText,
                    thumbnail: v.thumbnail?.thumbnails?.[0]?.url,
                    publishedTime: v.publishedTimeText?.simpleText,
                    viewCount: v.viewCountText?.simpleText,
                    duration:
                      v.thumbnailOverlays?.find(
                        (o: any) => o.thumbnailOverlayTimeStatusRenderer
                      )?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || null,
                    videoUrl: `https://m.youtube.com/watch?v=${v.videoId}`,
                  })
                  videoCount++
                }
              }
            }
          }
        }
      }
    }

    return {
      channel: channelMetadata,
      latest_videos: videoDataList,
    }
  } catch (err: any) {
    throw new Error(`Failed to fetch YouTube data: ${err.message}`)
  }
}

// ========== HANDLER ========== //
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Parameter 'username' wajib diisi" }, { status: 400 })
  }

  try {
    const result = await youtubeStalk(username)
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.formData()
  const username = body.get("username")?.toString()

  if (!username) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: "Parameter 'username' wajib diisi" }, { status: 400 })
  }

  try {
    const result = await youtubeStalk(username)
    return NextResponse.json({ success: true, creator: "Ahzamycode", data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 })
  }
}
