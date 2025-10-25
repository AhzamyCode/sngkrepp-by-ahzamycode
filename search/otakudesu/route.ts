// app/api/tool/otakudesu/route.ts
/**
 * CR Ahzamycode
 * Otakudesu scraper (ongoing, search, detail, download)
 * GET  : ?type=<ongoing|search|detail|download>&<param>
 * POST : JSON {type:<tipe>,...}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://otakudesu.cloud';

/* ---------- helpers ---------- */
type TType = 'ongoing' | 'search' | 'detail' | 'download';

/* ---------- scrapers ---------- */
async function scrapeOngoing() {
  const { data } = await axios.get(BASE, { timeout: 15000 });
  const $ = cheerio.load(data);
  const results: any[] = [];
  $('.venz ul li').each((_, el) => {
    results.push({
      episode: $(el).find('.epz').text().trim(),
      type: $(el).find('.epztipe').text().trim(),
      date: $(el).find('.newnime').text().trim(),
      title: $(el).find('.jdlflm').text().trim(),
      link: $(el).find('a').attr('href'),
      image: $(el).find('img').attr('src'),
    });
  });
  return results;
}

async function scrapeSearch(query: string) {
  const { data } = await axios.get(`${BASE}/`, {
    params: { s: query, post_type: 'anime' },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  const list: any[] = [];
  $('.chivsrc li').each((_, el) => {
    list.push({
      title: $(el).find('h2 a').text().trim(),
      link: $(el).find('h2 a').attr('href'),
      imageUrl: $(el).find('img').attr('src'),
      genres: $(el).find('.set').first().text().replace('Genres : ', '').trim(),
      status: $(el).find('.set').eq(1).text().replace('Status : ', '').trim(),
      rating: $(el).find('.set').eq(2).text().replace('Rating : ', '').trim() || 'N/A',
    });
  });
  return list;
}

async function scrapeDetail(url: string) {
  const { data } = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(data);
  const info: any = {};
  $('.fotoanime .infozingle p').each((_, el) => {
    const raw = $(el).text().trim();
    if (raw.includes('Judul:')) info.title = raw.replace('Judul:', '').trim();
    if (raw.includes('Japanese:')) info.japaneseTitle = raw.replace('Japanese:', '').trim();
    if (raw.includes('Skor:')) info.score = raw.replace('Skor:', '').trim();
    if (raw.includes('Produser:')) info.producer = raw.replace('Produser:', '').trim();
    if (raw.includes('Tipe:')) info.type = raw.replace('Tipe:', '').trim();
    if (raw.includes('Status:')) info.status = raw.replace('Status:', '').trim();
    if (raw.includes('Total Episode:')) info.totalEpisodes = raw.replace('Total Episode:', '').trim();
    if (raw.includes('Durasi:')) info.duration = raw.replace('Durasi:', '').trim();
    if (raw.includes('Tanggal Rilis:')) info.releaseDate = raw.replace('Tanggal Rilis:', '').trim();
    if (raw.includes('Studio:')) info.studio = raw.replace('Studio:', '').trim();
    if (raw.includes('Genre:')) info.genres = raw.replace('Genre:', '').trim();
  });
  info.imageUrl = $('.fotoanime img').attr('src');

  const episodes: any[] = [];
  $('.episodelist ul li').each((_, el) => {
    episodes.push({
      title: $(el).find('span a').text().trim(),
      link: $(el).find('span a').attr('href'),
      date: $(el).find('.zeebr').text().trim(),
    });
  });
  return { animeInfo: info, episodes };
}

async function scrapeDownload(url: string) {
  const { data } = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(data);
  const info: any = { title: $('.download h4').text().trim(), downloads: [] };
  $('.download ul li').each((_, el) => {
    const quality = $(el).find('strong').text().trim();
    $(el).find('a').each((_, a) => {
      info.downloads.push({
        quality,
        link: $(a).attr('href'),
        host: $(a).text().trim(),
      });
    });
  });
  return info;
}

/* ---------- router ---------- */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') as TType | null;
  if (!type) return NextResponse.json({ success: false, error: '?type= required (ongoing|search|detail|download)', code: 400 }, { status: 400 });

  try {
    let data: any = null;
    if (type === 'ongoing') data = await scrapeOngoing();
    else if (type === 'search') {
      const q = sp.get('q')?.trim();
      if (!q) return NextResponse.json({ success: false, error: '?q= required for search', code: 400 }, { status: 400 });
      data = await scrapeSearch(q);
    } else if (type === 'detail') {
      const url = sp.get('url')?.trim();
      if (!url) return NextResponse.json({ success: false, error: '?url= required for detail', code: 400 }, { status: 400 });
      data = await scrapeDetail(url);
    } else if (type === 'download') {
      const url = sp.get('url')?.trim();
      if (!url) return NextResponse.json({ success: false, error: '?url= required for download', code: 400 }, { status: 400 });
      data = await scrapeDownload(url);
    } else {
      return NextResponse.json({ success: false, error: 'type tidak valid', code: 400 }, { status: 400 });
    }
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = body.type as TType | null;
  if (!type) return NextResponse.json({ success: false, error: 'type required (ongoing|search|detail|download)', code: 400 }, { status: 400 });

  try {
    let data: any = null;
    if (type === 'ongoing') data = await scrapeOngoing();
    else if (type === 'search') {
      const q = body.q?.trim();
      if (!q) return NextResponse.json({ success: false, error: 'q required for search', code: 400 }, { status: 400 });
      data = await scrapeSearch(q);
    } else if (type === 'detail') {
      const url = body.url?.trim();
      if (!url) return NextResponse.json({ success: false, error: 'url required for detail', code: 400 }, { status: 400 });
      data = await scrapeDetail(url);
    } else if (type === 'download') {
      const url = body.url?.trim();
      if (!url) return NextResponse.json({ success: false, error: 'url required for download', code: 400 }, { status: 400 });
      data = await scrapeDownload(url);
    } else {
      return NextResponse.json({ success: false, error: 'type tidak valid', code: 400 }, { status: 400 });
    }
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Scrape gagal', code: 500 }, { status: 500 });
  }
}