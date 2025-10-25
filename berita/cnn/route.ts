import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import moment from 'moment';

const base_url = 'https://www.cnnindonesia.com';

async function scrapeCNNIndonesiaNews() {
  try {
    const response = await axios.get(base_url);
    const $ = cheerio.load(response.data);
    const articles = $('div.nhl-list article.flex-grow');
    const results: any[] = [];

    articles.each((_, e) => {
      const tagA = $('a.flex', e);
      const title = tagA.attr('dtr-ttl')?.replace(/\n/g, '').trim();
      const image_thumbnail = $('img', tagA).attr('src');
      const link = tagA.attr('href');
      if (!title || !image_thumbnail || !link) return;

      const url = new URL(image_thumbnail);
      url.searchParams.set('w', '1024');
      url.searchParams.set('q', '100');
      const image_full = url.toString();

      const timeMatch = link.split('/')[4]?.split('-')[0];
      const newTime = timeMatch ? moment(timeMatch, 'YYYYMMDDhh:mm:ss').format('YYYY-MM-DD hh:mm') : '';
      const slug = link.replace(base_url, '');

      results.push({ title, image_thumbnail, image_full, time: newTime, link, slug, content: '' });
    });

    return results;
  } catch (err: any) {
    throw new Error(err.message || 'Failed to scrape CNN Indonesia News');
  }
}

export async function GET(req: NextRequest) {
  try {
    const data = await scrapeCNNIndonesiaNews();
    return NextResponse.json({ success: true, creator: "Ahzamycode", data, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, creator: "Ahzamycode", error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
