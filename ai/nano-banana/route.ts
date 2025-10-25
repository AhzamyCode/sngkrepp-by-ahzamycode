import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

// =======================
// 🔐 AUTH GENERATOR CLASS
// =======================
class AuthGenerator {
  static #PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
  static #S = "NHGNy5YFz7HeFb";

  appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  aesEncrypt(data: string, key: string, iv: string) {
    const keyBuffer = Buffer.from(key, "utf8");
    const ivBuffer = Buffer.from(iv, "utf8");
    const cipher = crypto.createCipheriv("aes-128-cbc", keyBuffer, ivBuffer);

    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  generateRandomString(length: number) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
    return result;
  }

  generate() {
    const t = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID();
    const tempAesKey = this.generateRandomString(16);

    const encryptedData = crypto.publicEncrypt(
      {
        key: AuthGenerator.#PUBLIC_KEY,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(tempAesKey)
    );
    const secret_key = encryptedData.toString("base64");

    const dataToSign = `${this.appId}:${AuthGenerator.#S}:${t}:${nonce}:${secret_key}`;
    const sign = this.aesEncrypt(dataToSign, tempAesKey, tempAesKey);

    return {
      app_id: this.appId,
      t: t,
      nonce: nonce,
      sign: sign,
      secret_key: secret_key,
    };
  }
}

// =======================
// 🔧 CONVERT FUNCTION
// =======================
async function convert(buffer: Buffer, prompt: string) {
  try {
    const auth = new AuthGenerator("ai_df");
    const authData = auth.generate();
    const userId = auth.generateRandomString(64).toLowerCase();

    const headers = {
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0",
      Referer: "https://deepfakemaker.io/nano-banana-ai/",
    };

    const instance = axios.create({
      baseURL: "https://apiv1.deepfakemaker.io/api",
      params: authData,
      headers,
    });

    // Upload file ke CDN deepfakemaker.io
    const file = await instance
      .post("/user/v2/upload-sign", {
        filename: auth.generateRandomString(32) + "_" + Date.now() + ".jpg",
        hash: crypto.createHash("sha256").update(buffer).digest("hex"),
        user_id: userId,
      })
      .then((i) => i.data);

    await axios.put(file.data.url, buffer, {
      headers: {
        "content-type": "image/jpeg",
        "content-length": buffer.length,
      },
    });

    // Kirim task ke endpoint nano banana
    const taskData = await instance
      .post("/replicate/v1/free/nano/banana/task", {
        prompt,
        platform: "nano_banana",
        images: ["https://cdn.deepfakemaker.io/" + file.data.object_name],
        output_format: "png",
        user_id: userId,
      })
      .then((i) => i.data);

    // Tunggu hasilnya
    const progress = await new Promise<string>((resolve, reject) => {
      let retries = 20;
      const interval = setInterval(async () => {
        try {
          const xz = await instance
            .get("/replicate/v1/free/nano/banana/task", {
              params: {
                user_id: userId,
                ...taskData.data,
              },
            })
            .then((i) => i.data);

          if (xz.msg === "success") {
            clearInterval(interval);
            resolve(xz.data.generate_url);
          }

          if (--retries <= 0) {
            clearInterval(interval);
            reject(new Error("Failed to get task."));
          }
        } catch (e) {
          clearInterval(interval);
          reject(e);
        }
      }, 2500);
    });

    return progress;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// =======================
// 🧩 API ROUTE HANDLERS
// =======================

// POST — upload file
export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;
    const prompt = (data.get("prompt") as string) || "Convert this image creatively.";

    if (!file) {
      return NextResponse.json({ success: false, creator: "Ahzamycode", error: "File not provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resultUrl = await convert(buffer, prompt);

    return NextResponse.json({ success: true, creator: "Ahzamycode", url: resultUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET — pakai URL gambar
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("imageUrl");
    const prompt =
      searchParams.get("prompt") ||
      "Turn this photo into a character figure with creative background.";

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter 'imageUrl' is required. Example: ?imageUrl=https://example.com/image.jpg",
        },
        { status: 400 }
      );
    }

    const imageResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageResp.data);

    const resultUrl = await convert(buffer, prompt);

    return NextResponse.json({ success: true, creator: "Ahzamycode", url: resultUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, creator: "Ahzamycode", error: err.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
