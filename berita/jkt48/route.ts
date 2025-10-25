import { NextRequest, NextResponse } from 'next/server';
import got from 'got';
import * as cheerio from 'cheerio';

async function scrapeJKT48News() {
  const response = await got('https://jkt48.com/news/list?lang=id', {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    },
    timeout: { request: 30000 },
    retry: { limit: 3, methods: ['GET'], statusCodes: [408,413,429,500,502,503,504] },
  });

  const $ = cheerio.load(response.body);
  const results: any[] = [];

  $('.entry-news__list').each((_, el) => {
    const $item = $(el);
    if ($item.hasClass('entry-news__list--pagination')) return;

    const title = $item.find('.entry-news__list--item h3 a').text().trim();
    const link = 'https://jkt48.com' + $item.find('.entry-news__list--item h3 a').attr('href');
    const date = $item.find('.entry-news__list--item time').text().trim();
    const icon = 'https://jkt48.com' + $item.find('.entry-news__list--label img').attr('src');

    if (title && link) results.push({ title, link, date, icon });
  });

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const data = await scrapeJKT48News();
    if (data.length === 0) return NextResponse.json({ success: false, error: 'No news found' }, { status: 404 });
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
