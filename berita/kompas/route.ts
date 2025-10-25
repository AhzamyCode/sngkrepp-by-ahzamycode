import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/* ---------- tipe eksplisit ---------- */
interface IAuthor {
  id: string | null;
  name: string;
  jobTitle: string;
}

interface IArticleSummary {
  guid: string;
  title: string;
  url: string;
  imageUrl: string;
  channel: string;
  section: string;
  publishedDate: Date | null;
}

interface IArticle {
  guid: string;
  title: string;
  url: string;
  description: string;
  channel: string;
  tags: string[];
  publishedDate: Date;
  author: IAuthor;
  editor: IAuthor;
  images: any[];
  videos: any[];
  contentHtml: string;
  contentText: string;
}

/* ---------- helper: fetch JSON (Edge-safe) ---------- */
async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Fetch error ${res.status}`);
  return res.json();
}

/* ---------- Author ---------- */
class Author implements IAuthor {
  public id: string | null;
  public name: string;
  public jobTitle: string;

  constructor(raw: any = {}) {
    this.id = raw.id || null;
    this.name = raw.name || 'N/A';
    this.jobTitle = raw.jobtitle ? raw.jobtitle.trim() : '';
  }
}

/* ---------- ArticleSummary ---------- */
class ArticleSummary implements IArticleSummary {
  public guid: string;
  public title: string;
  public url: string;
  public imageUrl: string;
  public channel: string;
  public section: string;
  public publishedDate: Date | null;

  constructor(raw: any = {}) {
    this.guid = raw.guid || '';
    this.title = raw.title || 'No Title';
    this.url = raw.url || '';
    this.imageUrl = raw.image || raw.img || '';
    this.channel = raw.channel || 'N/A';
    this.section = raw.section || 'N/A';
    this.publishedDate = raw.date ? new Date(raw.date) : null;
  }
}

/* ---------- Article ---------- */
class Article implements IArticle {
  public guid: string;
  public title: string;
  public url: string;
  public description: string;
  public channel: string;
  public tags: string[];
  public publishedDate: Date;
  public author: IAuthor;
  public editor: IAuthor;
  public images: any[];
  public videos: any[];
  public contentHtml: string;
  public contentText: string;

  constructor(raw: any, guid: string) {
    this.guid = guid;
    this.title = raw.title || 'No Title';
    this.url = raw.urlpage || '';
    this.description = raw.description || '';
    this.channel = raw.kanal || 'N/A';
    this.tags = raw.tags || [];
    this.publishedDate = new Date(raw.date);
    this.author = new Author(raw.author);
    this.editor = new Author(raw.editor);
    this.images = this._processMedia(raw.photoblock, 'image');
    this.videos = this._processMedia(raw.videoblock, 'video');
    const { html, text } = this._processContent(raw.content);
    this.contentHtml = html;
    this.contentText = text;
  }

  _processMedia(mediaBlock: any[] = [], type: string) {
    return mediaBlock.map((item: any) => ({
      url: item.block,
      author: item.author || null,
      caption: item.caption || null,
      order: parseInt(item.orderid, 10),
    }));
  }

  _processContent(contentArray: string[] = []) {
    let fullHtml = contentArray
      .map((htmlString: string) => {
        if (htmlString.includes('[video.1]')) {
          const videoUrl = this.videos[0]?.url;
          return videoUrl ? `<p><strong>[Embedded Video]</strong> <a href="${videoUrl}" target="_blank">${videoUrl}</a></p>` : '';
        }
        return htmlString;
      })
      .join('');
    const plainText = fullHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n* ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim();
    return { html: fullHtml, text: plainText };
  }
}

/* ---------- Core Kompas Scraper (struktur KAMU) ---------- */
class Kompas {
  private baseUrl = 'https://api.kompas.com/apps';
  private recommendationUrl = 'https://recommendation.kgdata.dev/rec/kompascom/api/v2';
  private defaultHeaders = {
    'User-Agent': 'kompascom-android',
    'Accept-Encoding': 'gzip',
  };

  async getLatestNews(page = 1) {
    const url = `${this.baseUrl}/home?pages=${page}`;
    const data = await getJson<any>(url, { headers: this.defaultHeaders });
    const raw = data.latest || [];
    return raw.map((a: any) => new ArticleSummary(a));
  }

  async getArticleDetail(guid: string) {
    if (!guid) throw new Error('GUID must be provided.');
    const url = `${this.baseUrl}/v1/detail?guid=${guid}`;
    const data = await getJson<any>(url, { headers: this.defaultHeaders });
    return new Article(data.result, guid);
  }

  async getRelatedArticles(pageUrl: string) {
    if (!pageUrl) throw new Error('Page URL must be provided.');
    const url = `${this.recommendationUrl}/recommendation/item`;
    const payload = { pageurl: pageUrl, pagetype: 'read', ukid: '' };
    const headers = { ...this.defaultHeaders, 'Content-Type': 'application/json; charset=UTF-8' };
    const data = await getJson<any>(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const raw = data.items || [];
    return raw.map((a: any) => new ArticleSummary(a));
  }
}

/* ---------- handler GET (latest news) ---------- */
async function handleGET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? 1);

  try {
    const kompas = new Kompas();
    const list = await kompas.getLatestNews(page);
    return NextResponse.json({ success: true, data: list, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/* ---------- handler POST (detail + related) ---------- */
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { guid, pageUrl } = body;

  if (!guid && !pageUrl)
    return NextResponse.json({ success: false, error: 'guid atau pageUrl wajib' }, { status: 400 });

  try {
    const kompas = new Kompas();
    let detail = null;
    let related = [];

    if (guid) detail = await kompas.getArticleDetail(guid);
    if (pageUrl) related = await kompas.getRelatedArticles(pageUrl);

    return NextResponse.json({ success: true, creator: "Ahzamycode", data: { detail, related }, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: e.message }, { status: 500 });
  }
}

/* ---------- main route ---------- */
export async function GET(req: NextRequest) {
  return handleGET(req);
}

export async function POST(req: NextRequest) {
  return handlePOST(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}