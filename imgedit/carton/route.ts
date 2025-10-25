import { NextRequest } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto-js";
import FormData from "form-data";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

// Proxy helper default
const proxy = () => "";

// Helper buat balikin gambar
const createImageResponse = (buffer: Uint8Array, filename: string | null = null) => {
  const headers: { [key: string]: string } = {
    "Content-Type": "image/png",
    "Content-Length": buffer.length.toString(),
    "Cache-Control": "public, max-age=3600",
  };
  if (filename) headers["Content-Disposition"] = `inline; filename="${filename}"`;
  return new Response(Buffer.from(buffer), { headers });
};

// ==== PhotoToCartoonAPI CLASS ====
class PhotoToCartoonAPI {
  BASE = "https://imgedit.ai/";
  UPLOAD = "https://uploads.imgedit.ai/api/v1/draw-cf/upload";
  GENERATE = "https://imgedit.ai/api/v1/draw-cf/generate";
  TASK = "https://imgedit.ai/api/v1/draw-cf/";
  KEY = this.randomChar(16);
  aesKey: string | null = null;
  iv: string | null = null;
  headers = {
    "authority": "uploads.imgedit.ai",
    "accept": "application/json, text/plain, */*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "authorization": "null",
    "origin": "https://imgedit.ai",
    "referer": "https://imgedit.ai/",
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
  };

  // ✨ TS-safe index signature
  styleMaps: { [template: string]: { [styleName: string]: number } } = {
    sketch_v2: {
      ink_painting: 16,
      bg_line: 15,
      color_rough: 14,
      gouache: 13,
      manga_sketch: 12,
      ink_sketch: 11,
      pencil_sketch: 10,
      sketch: 8,
      anime_sketch: 6,
      line_art: 3,
      simplex: 4,
      doodle: 5,
      intricate_line: 2,
    },
    anime: {
      color_rough: 42,
      ink_painting: 41,
      "3d": 40,
      clay: 39,
      mini: 38,
      illustration: 37,
      wojak: 36,
      felted_doll: 35,
      comic_book: 33,
      vector: 32,
      gothic: 29,
      "90s_shoujomanga": 26,
      grumpy_3d: 25,
      tinies: 24,
      witty: 23,
      simple_drawing: 22,
      ink_stains: 21,
      crayon: 20,
    },
  };

  randomChar(length: number) {
    const char = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }).map(() => char.charAt(Math.floor(Math.random() * char.length))).join("");
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchKeys() {
    const { data } = await axios.get(this.BASE, { headers: this.headers });
    const $ = cheerio.load(data);
    const scriptUrls: string[] = [];
    $('script[src]').each((_, el) => {
      const scriptSrc = $(el).attr("src");
      if (scriptSrc && scriptSrc.includes("/_nuxt/js/")) scriptUrls.push(`https://imgedit.ai${scriptSrc}`);
    });
    const latestScriptUrl = scriptUrls[scriptUrls.length - 1];
    const response = await axios.get(latestScriptUrl, { headers: this.headers });
    const scriptContent = response.data;
    const aesMatch = scriptContent.match(/var\s+aesKey\s*=\s*["'](\w{11,})['"]/i);
    const ivMatch = scriptContent.match(/var\s+iv\s*=\s*["'](\w{11,})['"]/i);
    this.aesKey = aesMatch ? aesMatch[1] : null;
    this.iv = ivMatch ? ivMatch[1] : null;
  }

  decrypt(enc: string) {
    if (!this.aesKey || !this.iv) throw new Error("AES key or IV not set. Call fetchKeys() first.");
    const key = crypto.enc.Utf8.parse(this.aesKey);
    const iv = crypto.enc.Utf8.parse(this.iv);
    const dec = crypto.AES.decrypt(enc, key, { iv, mode: crypto.mode.CBC, padding: crypto.pad.Pkcs7 });
    return JSON.parse(dec.toString(crypto.enc.Utf8));
  }

  async upload(buffer: Uint8Array, fileName: string) {
    const resFileType = await fileTypeFromBuffer(buffer);
    if (!resFileType || !resFileType.mime.startsWith("image/")) throw new Error("File type is not a supported image.");
    const form = new FormData();
    form.append("image", Buffer.from(buffer), { filename: fileName || `image.${resFileType.ext}`, contentType: resFileType.mime });
    const res = await axios.post(this.UPLOAD, form, {
      headers: { ...this.headers, ...form.getHeaders() },
      params: { ekey: this.KEY, soft_id: "imgedit_web" },
    });
    return this.decrypt(res.data.data);
  }

  async generate(template: string, styleName: string, data: any) {
    const styleId = this.styleMaps[template]?.[styleName];
    if (!styleId) throw new Error(`Style '${styleName}' tidak ditemukan untuk template '${template}'`);
    const opt = {
      template,
      seed: Date.now().toString(),
      style_id: styleId,
      extra_image_key: data?.data?.image,
    };
    const res = await axios.post(this.GENERATE, opt, { headers: this.headers, params: { ekey: this.KEY, soft_id: "imgedit_web" } });
    return this.decrypt(res.data.data);
  }

  async process(taskData: any) {
    while (true) {
      const res = await axios.get(this.TASK + taskData.data.task_id, { headers: this.headers, params: { ekey: this.KEY, soft_id: "imgedit_web" } });
      const dec = this.decrypt(res.data.data);
      if (dec.data.status === 2 && dec.data.images)
        return Uint8Array.from(Buffer.from(dec.data.images[0].split(",")[1], "base64"));
      await this.delay(1000);
    }
  }
}

// ==== Helpers ====
async function fromUrl(imageUrl: string, template: string, styleName: string) {
  const cartoon = new PhotoToCartoonAPI();
  await cartoon.fetchKeys();
  const { data } = await axios.get(proxy() + imageUrl, { responseType: "arraybuffer", timeout: 15000 });
  const buffer = new Uint8Array(data);
  const fileName = path.basename(new URL(imageUrl).pathname);
  const uploadData = await cartoon.upload(buffer, fileName);
  const taskData = await cartoon.generate(template, styleName, uploadData);
  return await cartoon.process(taskData);
}

async function fromFile(fileBuffer: Uint8Array, fileName: string, template: string, styleName: string) {
  const cartoon = new PhotoToCartoonAPI();
  await cartoon.fetchKeys();
  const uploadData = await cartoon.upload(fileBuffer, fileName);
  const taskData = await cartoon.generate(template, styleName, uploadData);
  return await cartoon.process(taskData);
}

// ==== GET & POST ====
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const image = url.searchParams.get("image");
  const template = url.searchParams.get("template");
  const style = url.searchParams.get("style");

  if (!image || !template || !style)
    return new Response(JSON.stringify({ status: false, error: "Parameters 'image', 'template', 'style' are required", code: 400 }), { status: 400 });

  try {
    const result = await fromUrl(image, template, style);
    return createImageResponse(result, `cartoon_image.png`);
  } catch (err: any) {
    return new Response(JSON.stringify({ status: false, error: err.message || "Failed to process image", code: 500 }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as any;
  const template = formData.get("template") as string;
  const style = formData.get("style") as string;

  if (!file || !template || !style)
    return new Response(JSON.stringify({ status: false, error: "Parameters 'image', 'template', 'style' are required", code: 400 }), { status: 400 });

  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const fileName = file.name;

  try {
    const result = await fromFile(fileBuffer, fileName, template, style);
    return createImageResponse(result, `cartoon_image.png`);
  } catch (err: any) {
    return new Response(JSON.stringify({ status: false, error: err.message || "Failed to process image", code: 500 }), { status: 500 });
  }
}
