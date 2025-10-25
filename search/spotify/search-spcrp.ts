import puppeteer from "puppeteer";

export async function scrapeSpotifySearch(query: string): Promise<any[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(
      query
    )}`;
    await page.goto(searchUrl, { waitUntil: "networkidle2" });
    // The error occurs because `waitForTimeout` is a method on the `Browser` and `Frame` classes in Puppeteer, but not on the `Page` class in some versions, or your type definitions may not include it.
    // To achieve a 3000ms delay, you can use a simple `await new Promise(res => setTimeout(res, 3000));` instead.
    await new Promise(res => setTimeout(res, 3000));
    // Tunggu list muncul
    await page.waitForSelector('section[aria-label="Top result"], section[aria-label="Songs"]', { timeout: 15000 });
    

    
    // Ambil hasil
    const results = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div[data-testid="tracklist-row"]'));
        return items.map((item) => {
          const title = item.querySelector('div[dir="auto"]')?.textContent || "";
          const artist = item.querySelector('span a')?.textContent || "";
          const thumbnail = item.querySelector('img')?.getAttribute("src") || "";
          const url = item.querySelector('a')?.getAttribute("href") || "";
      
          return { title, artist, thumbnail, url: `https://open.spotify.com${url}` };
        });
      });
      

    return results;
  } finally {
    await browser.close();
  }
}
