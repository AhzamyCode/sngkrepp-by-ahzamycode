// app/api/search/jadwal-sholat/route.ts
/**
 * CR Ahzamycode
 * Handler untuk /api/search/jadwal-sholat
 * kota → jadwal sholat hari ini (global)
 * GET  : ?kota=<nama>&negara=<opsional>
 * POST : JSON {kota:<nama>,negara:<opsional>}
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/* ---------- util ---------- */
const METHODS: Record<string, number> = {
  indonesia: 1, malaysia: 1, singapore: 10, brunei: 1,
  'saudi arabia': 4, egypt: 5, turkey: 12, iran: 6,
  kuwait: 8, qatar: 9, uae: 7, usa: 2, canada: 2,
  uk: 2, france: 11, russia: 13,
};

function toMinutes(t: string): number {
  const [time, period] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period) {
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
}

function nextPrayer(nowMin: number, times: Record<string, string>) {
  const prayers = [
    { name: 'Subuh', time: toMinutes(times.Fajr) },
    { name: 'Dzuhur', time: toMinutes(times.Dhuhr) },
    { name: 'Ashar', time: toMinutes(times.Asr) },
    { name: 'Maghrib', time: toMinutes(times.Maghrib) },
    { name: 'Isya', time: toMinutes(times.Isha) },
  ];
  for (const p of prayers) if (p.time > nowMin) return p;
  return { name: 'Subuh', time: toMinutes(times.Fajr) }; // besok
}

/* ---------- core ---------- */
async function getCoordinates(city: string, country: string) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: `${city} ${country}`, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'Kevyll-API/1.0' },
  });
  if (!data.length) throw new Error('Kota tidak ditemukan');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
}

async function getPrayerTimes(lat: number, lon: number, method = 1) {
  const today = new Date();
  const dd = today.getDate();
  const mm = today.getMonth() + 1;
  const yy = today.getFullYear();

  // Prioritas: Aladhan → PrayerZone → fallback
  try {
    const { data } = await axios.get(`http://api.aladhan.com/v1/timings/${dd}-${mm}-${yy}`, {
      params: { latitude: lat, longitude: lon, method, school: 1 },
      timeout: 8000,
    });
    if (data.code === 200) {
      const t = data.data.timings;
      return { ...t, source: 'Aladhan API', method: METHODS[method] || 'Standard' };
    }
  } catch {}

  try {
    const { data } = await axios.get('http://api.pray.zone/v2/times/today.json', {
      params: { latitude: lat, longitude: lon, elevation: 0, school: 1 },
      timeout: 8000,
    });
    if (data.results) {
      const t = data.results.datetime[0].times;
      return { ...t, source: 'Pray Zone', method: 'PrayerZone' };
    }
  } catch {}

  throw new Error('Semua API jadwal gagal');
}

async function getSchedule(city: string, country = '') {
  const { lat, lon, display } = await getCoordinates(city, country);
  const method = METHODS[country.toLowerCase()] || 1;
  const times = await getPrayerTimes(lat, lon, method);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const next = nextPrayer(nowMin, times);

  return {
    location: display,
    city,
    country: country || "indonesia",
    date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    update: new Date().toLocaleTimeString('id-ID'),
    coordinates: { lat, lon },
    method: times.method,
    source: times.source,
    schedule: {
      Subuh: times.Fajr,
      Syuruq: times.Sunrise,
      Dzuhur: times.Dhuhr,
      Ashar: times.Asr,
      Maghrib: times.Maghrib,
      Isya: times.Isha,
    },
    nextPrayer: {
      name: next.name,
      time: times[next.name === 'Subuh' ? 'Fajr' : next.name as keyof typeof times],
      countDown: `${Math.floor((next.time - nowMin) / 60)} jam ${(next.time - nowMin) % 60} menit`,
    },
  };
}

/* ---------- handlers ---------- */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kota = sp.get('kota')?.trim();
  const negara = sp.get('negara')?.trim() || '';

  if (!kota) return NextResponse.json({ success: false, error: '?kota= required', code: 400 }, { status: 400 });

  try {
    const result = await getSchedule(kota, negara);
    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Gagal mengambil jadwal', code: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const kota = body.kota?.trim();
  const negara = body.negara?.trim() || '';

  if (!kota) return NextResponse.json({ success: false, error: 'kota required', code: 400 }, { status: 400 });

  try {
    const result = await getSchedule(kota, negara);
    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Gagal mengambil jadwal', code: 500 }, { status: 500 });
  }
}