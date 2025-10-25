// app/api/search/bstation/route.ts
/**
 * CR Ahzamycode
 * Bilibili TV (bstation) search scraper
 * GET  : ?q=<keyword>
 * POST : JSON {q:<keyword>}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://www.bilibili.tv';

async function searchBstation(keyword: string) {
  const url = `${BASE}/en/search-result?q=${encodeURIComponent(keyword)}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(data);
  const results: any[] = [];

  $('li.section__list__item').each((_, el) => {
    const title = $(el).find('.highlights i').text().trim();
    const videoUrl = BASE + $(el).find('.bstar-video-card__cover-link').attr('href');
    const thumbnail = $(el).find('.bstar-image__img').attr('src');
    const duration = $(el).find('.bstar-video-card__cover-mask-text--bold').text().trim();
    const uploader = $(el).find('.bstar-video-card__nickname span').text().trim();
    const views = $(el).find('.bstar-video-card__desc').text().trim().replace(/·/g, '').trim();

    if (title) {
      results.push({ title, videoUrl, thumbnail, duration, uploader, views });
    }
  });

  return results;
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ success: false, error: '?q= required', code: 400 }, { status: 400 });

  try {
    const data = await searchBstation(q);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const q = body.q?.trim();
  if (!q) return NextResponse.json({ success: false, error: 'q required', code: 400 }, { status: 400 });

  try {
    const data = await searchBstation(q);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}