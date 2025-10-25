// app/api/search/lyrics/scrape-lyrics.ts

import axios from 'axios';

/**
 * Fungsi untuk melakukan scraping pencarian lirik dari lrclib.net
 * @param query - Judul lagu atau nama artis yang akan dicari
 * @returns {Promise<any>} - Hasil pencarian dalam format JSON
 */
export async function scrapeLyricsSearch(query: string) {
  try {
    if (!query) throw new Error('Query is required');
    
    const { data } = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        // Header ini penting agar tidak diblokir oleh server target
        referer: `https://lrclib.net/search/${encodeURIComponent(query)}`,
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      }
    });
    
    return data;
  } catch (error) {
    // Lempar error agar bisa ditangkap oleh route handler utama
    throw new Error(error.message);
  }
}