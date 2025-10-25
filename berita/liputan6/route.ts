import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const base_url = 'https://www.liputan6.com';

async function scrapeLiputan6News() {
  const response = await axios.get(base_url);
  const $ = cheerio.load(response.data);
  const results: any[] = [];

  $('.articles--iridescent-list article').each((_, e) => {
    const title = $('.articles--iridescent-list--text-item__title-link-text', e).text().trim();
    const link = $('h4.articles--iridescent-list--text-item__title a', e).attr('href');
    const image_thumbnail = $('picture.articles--iridescent-list--text-item__figure-image img', e).attr('src');
    const time = $('.articles--iridescent-list--text-item__time', e).text().trim();
    if (title && link) results.push({ title, link, image_thumbnail, time });
  });

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const data = await scrapeLiputan6News();
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
