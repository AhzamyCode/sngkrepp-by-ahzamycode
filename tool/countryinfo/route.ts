import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/* ---------- helper fetch JSON (Edge-safe) ---------- */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 1 hari
  if (!res.ok) throw new Error(`Fetch error ${res.status}`);
  return res.json();
}

/* ---------- similarity (struktur KAMU) ---------- */
function calculateSimilarity(str1: string, str2: string): number {
  str1 = str1.toLowerCase().replace(/\s+/g, '');
  str2 = str2.toLowerCase().replace(/\s+/g, '');
  if (str1 === str2) return 1;
  const maxLen = Math.max(str1.length, str2.length);
  if (str2.includes(str1) || str1.includes(str2)) return 0.9;
  let matches = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) if (str1[i] === str2[i]) matches++;
  const prefixMatch = (str1.startsWith(str2.slice(0, 3)) || str2.startsWith(str1.slice(0, 3))) ? 0.2 : 0;
  return matches / maxLen + prefixMatch;
}

/* ---------- core scrape (alur & header KAMU) ---------- */
async function scrapeCountryInfo(name: string) {
  const [coords, countries] = await Promise.all([
    getJson<Array<{ name: string; country: string; icon: string; latitude: number; longitude: number }>>(
      'https://raw.githubusercontent.com/CoderPopCat/Country-Searcher/refs/heads/master/src/constants/country-coords.json'
    ),
    getJson<Array<any>>(
      'https://raw.githubusercontent.com/CoderPopCat/Country-Searcher/refs/heads/master/src/constants/countries.json'
    ),
  ]);

  const searchName = name.toLowerCase().trim();
  const similarityResults = countries
    .map((c) => ({ country: c, similarity: calculateSimilarity(searchName, c.country) }))
    .sort((a, b) => b.similarity - a.similarity);

  const best = similarityResults[0];
  if (!best || best.similarity < 0.4) {
    throw {
      status: 404,
      error: 'Country not found',
      suggestions: similarityResults.slice(0, 5).map((r) => ({ country: r.country.country, similarity: r.similarity })),
    };
  }

  const country = best.country;
  const coord = coords.find((c) => c.name.toLowerCase() === country.country.toLowerCase());

  const continents: Record<string, { name: string; emoji: string }> = {
    as: { name: 'Asia', emoji: '🌏' },
    eu: { name: 'Europe', emoji: '🌍' },
    af: { name: 'Africa', emoji: '🌍' },
    na: { name: 'North America', emoji: '🌎' },
    sa: { name: 'South America', emoji: '🌎' },
    oc: { name: 'Oceania', emoji: '🌏' },
    an: { name: 'Antarctica', emoji: '🌎' },
  };

  const neighbors = country.neighbors
    .map((code: string) => {
      const n = coords.find((c) => c.country.toLowerCase() === code.toLowerCase());
      return n
        ? {
            name: n.name,
            flag: n.icon,
            coordinates: { latitude: n.latitude, longitude: n.longitude },
          }
        : null;
    })
    .filter(Boolean);

  return {
    status: true,
    searchMetadata: {
      originalQuery: name,
      matchedCountry: country.country,
      similarity: best.similarity,
    },
    data: {
      name: country.country,
      capital: country.capital,
      flag: country.flag,
      phoneCode: country.phone_code,
      googleMapsLink: `https://www.google.com/maps/place/${encodeURIComponent(country.country)}/@${coord?.latitude || 0},${coord?.longitude || 0},6z`,
      continent: {
        code: country.continent,
        name: continents[country.continent]?.name || 'Unknown',
        emoji: continents[country.continent]?.emoji || '🌐',
      },
      coordinates: { latitude: coord?.latitude || null, longitude: coord?.longitude || null },
      area: { squareKilometers: country.area.km2, squareMiles: country.area.mi2 },
      landlocked: country.is_landlocked,
      languages: { native: country.native_language, codes: country.language_codes },
      famousFor: country.famous_for,
      constitutionalForm: country.constitutional_form,
      neighbors,
      currency: country.currency,
      drivingSide: country.drive_direction,
      alcoholProhibition: country.alcohol_prohibition,
      internetTLD: country.tld,
      isoCode: { numeric: country.iso.numeric, alpha2: country.iso.alpha_2, alpha3: country.iso.alpha_3 },
    },
  };
}

/* ---------- handler GET ---------- */
async function handleGET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name')?.trim() ?? '';
  if (!name) return NextResponse.json({ success: false, error: 'name wajib' }, { status: 400 });

  try {
    const result = await scrapeCountryInfo(name);
    return NextResponse.json({ ...result, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.error || 'Internal error', ...(e.suggestions && { suggestions: e.suggestions }) },
      { status: e.status || 500 }
    );
  }
}

/* ---------- handler POST ---------- */
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ success: false, creator: "Ahzamycode", error: 'name wajib' }, { status: 400 });

  try {
    const result = await scrapeCountryInfo(name);
    return NextResponse.json({ ...result, creator: "Ahzamycode",  timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, creator: "Ahzamycode", error: e.error || 'Internal error', ...(e.suggestions && { suggestions: e.suggestions }) },
      { status: e.status || 500 }
    );
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