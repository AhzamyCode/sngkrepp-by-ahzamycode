import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/* ---------- helper: fetch JSON (tanpa axios) ---------- */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 1 hari
  if (!res.ok) throw new Error(`Fetch error ${res.status}`);
  return res.json();
}

/* ---------- core logic: 100% sesuai script kamu ---------- */
async function nikParse(nik: string) {
  try {
    const provincesRes = await getJson<Array<{ id: string; name: string }>>('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json');
    const provinces = Object.fromEntries(provincesRes.map((p) => [p.id, p.name.toUpperCase()]));

    nik = nik.toString();
    if (nik.length !== 16 || !provinces[nik.slice(0, 2)]) throw new Error('NIK tidak valid: panjang atau kode provinsi salah');

    const provinceId = nik.slice(0, 2);
    const regenciesRes = await getJson<Array<{ id: string; name: string }>>(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
    const regencies = Object.fromEntries(regenciesRes.map((r) => [r.id, r.name.toUpperCase()]));

    if (!regencies[nik.slice(0, 4)]) throw new Error('NIK tidak valid: kode kabupaten/kota salah');

    const regencyId = nik.slice(0, 4);
    const districtsRes = await getJson<Array<{ id: string; name: string }>>(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regencyId}.json`);
    const districts = Object.fromEntries(districtsRes.map((d) => [d.id.slice(0, -1), `${d.name.toUpperCase()}`]));

    if (!districts[nik.slice(0, 6)]) throw new Error('NIK tidak valid: kode kecamatan salah');

    const province = provinces[provinceId];
    const city = regencies[regencyId];
    const subdistrict = districts[nik.slice(0, 6)];
    const day = parseInt(nik.slice(6, 8));
    const month = parseInt(nik.slice(8, 10));
    const yearCode = nik.slice(10, 12);
    const uniqCode = nik.slice(12, 16);

    const gender = day > 40 ? 'PEREMPUAN' : 'LAKI-LAKI';
    const birthDay = day > 40 ? (day - 40).toString().padStart(2, '0') : day.toString().padStart(2, '0');
    const birthYear = parseInt(yearCode, 10) < parseInt(new Date().getFullYear().toString().slice(-2), 10) ? `20${yearCode}` : `19${yearCode}`;
    const birthDate = `${birthDay}/${month.toString().padStart(2, '0')}/${birthYear}`;
    const birth = new Date(`${birthYear}-${month.toString().padStart(2, '0')}-${birthDay}`);

    if (isNaN(birth.getTime())) throw new Error('Tanggal lahir tidak valid');

    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let remainingDays = today.getDate() - birth.getDate();
    if (remainingDays < 0) {
      remainingDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      months--;
    }
    if (months < 0) {
      months += 12;
      years--;
    }
    const age = `${years} Tahun ${months} Bulan ${remainingDays} Hari`;

    let ageCategory = '';
    if (years < 12) ageCategory = 'Anak-anak';
    else if (years < 18) ageCategory = 'Remaja';
    else if (years < 60) ageCategory = 'Dewasa';
    else ageCategory = 'Lansia';

    const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
    const timeDiff = nextBirthday.getTime() - today.getTime();
    const monthsLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30));
    const daysLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
    const birthdayCountdown = `${monthsLeft} Bulan ${daysLeft} Hari`;

    const baseDate = new Date(1970, 0, 2);
    const diffDays = Math.floor((birth.getTime() - baseDate.getTime() + 86400000) / (1000 * 60 * 60 * 24));
    const pasaranNames = ['Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const birthDateFull = `${birthDay} ${monthNames[month - 1]} ${birthYear}`;
    const pasaran = `${dayNames[birth.getDay()]} ${pasaranNames[Math.round((diffDays % 5) * 2) / 2] || 'Wage'}, ${birthDay} ${monthNames[month - 1]} ${birthYear}`;

    let zodiac = '';
    if ((month === 1 && parseInt(birthDay, 10) >= 20) || (month === 2 && parseInt(birthDay, 10) < 19)) zodiac = 'Aquarius';
    else if ((month === 2 && parseInt(birthDay, 10) >= 19) || (month === 3 && parseInt(birthDay, 10) < 21)) zodiac = 'Pisces';
    else if ((month === 3 && parseInt(birthDay, 10) >= 21) || (month === 4 && parseInt(birthDay, 10) < 20)) zodiac = 'Aries';
    else if ((month === 4 && parseInt(birthDay, 10) >= 20) || (month === 5 && parseInt(birthDay, 10) < 21)) zodiac = 'Taurus';
    else if ((month === 5 && parseInt(birthDay, 10) >= 21) || (month === 6 && parseInt(birthDay, 10) < 22)) zodiac = 'Gemini';
    else if ((month === 6 && parseInt(birthDay, 10) >= 22) || (month === 7 && parseInt(birthDay, 10) < 23)) zodiac = 'Cancer';
    else if ((month === 7 && parseInt(birthDay, 10) >= 23) || (month === 8 && parseInt(birthDay, 10) < 23)) zodiac = 'Leo';
    else if ((month === 8 && parseInt(birthDay, 10) >= 23) || (month === 9 && parseInt(birthDay, 10) < 23)) zodiac = 'Virgo';
    else if ((month === 9 && parseInt(birthDay, 10) >= 23) || (month === 10 && parseInt(birthDay, 10) < 24)) zodiac = 'Libra';
    else if ((month === 10 && parseInt(birthDay, 10) >= 24) || (month === 11 && parseInt(birthDay, 10) < 23)) zodiac = 'Scorpio';
    else if ((month === 11 && parseInt(birthDay, 10) >= 23) || (month === 12 && parseInt(birthDay, 10) < 22)) zodiac = 'Sagittarius';
    else if ((month === 12 && parseInt(birthDay, 10) >= 22) || (month === 1 && parseInt(birthDay, 10) < 20)) zodiac = 'Capricorn';

    const regencyType = city.includes('KOTA') ? 'Kota' : 'Kabupaten';
    const areaCode = `${provinceId}.${regencyId.slice(2)}.${nik.slice(4, 6)}`;

    return {
      nik,
      kelamin: gender,
      lahir: birthDate,
      lahir_lengkap: birthDateFull,
      provinsi: { kode: provinceId, nama: province },
      kotakab: { kode: regencyId, nama: city, jenis: regencyType },
      kecamatan: { kode: nik.slice(0, 6), nama: subdistrict },
      kode_wilayah: areaCode,
      nomor_urut: uniqCode,
      tambahan: {
        pasaran,
        usia: age,
        kategori_usia: ageCategory,
        ultah: `${birthdayCountdown} Lagi`,
        zodiak: zodiac,
      },
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/* ---------- handler GET ---------- */
async function handleGET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nik = searchParams.get('nik')?.trim() ?? '';
  if (!nik || nik.length !== 16) return NextResponse.json({ success: false, error: 'nik wajib 16 digit' }, { status: 400 });

  try {
    const data = await nikParse(nik);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/* ---------- handler POST ---------- */
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nik = (body.nik ?? '').trim();
  if (!nik || nik.length !== 16) return NextResponse.json({ success: false, error: 'nik wajib 16 digit' }, { status: 400 });

  try {
    const data = await nikParse(nik);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
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