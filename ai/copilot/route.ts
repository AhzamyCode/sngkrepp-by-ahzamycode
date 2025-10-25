/**
 * CR Ahzamycode
 * API: /api/ai/copilot
 * Desc: AI tools (Summarize, Paraphrase, Translate, etc.) via Translapp.info
 * Method:
 * - GET: Proses teks via query string (?text=...&module=...)
 * - POST: Proses teks via JSON body ({ text: "...", module: "..." })
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { createHash, randomUUID } from "crypto";

// --- Konfigurasi & Helper dari Code Asli ---
const API_BASE = "https://translapp.info";
const API_ENDPOINT = "/ai/g/ask";
const HEADERS = {
  "user-agent": "Postify/1.0.0",
  "content-type": "application/json",
  "accept-language": "en",
};

const MODULES = [
  "SUMMARIZE",
  "PARAPHRASE",
  "EXPAND",
  "TONE",
  "TRANSLATE",
  "REPLY",
  "GRAMMAR",
];

const TONES = ["Friendly", "Romantic", "Sarcastic", "Humour", "Social", "Angry", "Sad", "Other"];
const REPLIES = ["Short", "Medium", "Long"];

function _shorten(input: string) {
  if (input.length >= 5) return input.substring(0, 5);
  return "O".repeat(5 - input.length) + input;
}

function _hashString(str: string) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

// --- Fungsi Utama untuk Memproses Request ---
// Ini inti logikanya, dipanggil oleh GET dan POST handler
async function processCopilotRequest(
  text: string | null,
  module: string | null,
  to: string | null,
  customTone: string | null
) {
  // --- Validasi Input (dari code asli) ---
  if (!text || typeof text !== "string" || text.trim() === "") {
    return {
      success: false,
      code: 400,
      result: { error: "Teks wajib diisi bree, kagak boleh kosong 🫵🏻" },
    };
  }

  if (!module || !MODULES.includes(module)) {
    return {
      success: false,
      code: 400,
      result: {
        error: `Module wajib diisi bree, pilih salah satu yak: ${MODULES.join(", ")} 🗿`,
      },
    };
  }

  if (module === "TONE") {
    if (!to || !TONES.includes(to)) {
      return {
        success: false,
        code: 400,
        result: {
          error: `Parameter 'to' untuk TONE wajib diisi, pilih salah satu bree: ${TONES.join(", ")} 🙈️`,
        },
      };
    }
    if (to === "Other" && (!customTone || customTone.trim() === "")) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Kalo TONE pilih Other, customTone wajib diisi (contoh: 'Shy') 😳",
        },
      };
    }
  } else if (module === "TRANSLATE") {
    if (!to || typeof to !== "string" || to.trim() === "") {
      return {
        success: false,
        code: 400,
        result: {
          error: "Parameter 'to' untuk TRANSLATE wajib diisi, input bahasa targetnya (contoh: 'English') 🙈️",
        },
      };
    }
  } else if (module === "REPLY") {
    if (!to || !REPLIES.includes(to)) {
      return {
        success: false,
        code: 400,
        result: {
          error: `Parameter 'to' untuk REPLY wajib diisi, pilih salah satu bree: ${REPLIES.join(", ")} 🙈️`,
        },
      };
    }
  }

  // --- Eksekusi API ---
  try {
    const inputx = _shorten(text);
    const prefix = `${inputx}ZERO`;
    const key = _hashString(prefix);
    const userId = `GALAXY_AI${randomUUID()}`;
    const toValue = module === "TONE" && to === "Other" ? customTone : to;

    const payload = {
      k: key,
      module,
      text,
      to: toValue,
      userId,
    };

    const response = await axios.post(`${API_BASE}${API_ENDPOINT}`, payload, {
      headers: HEADERS,
    });

    const { data } = response;

    return {
      success: true,
      code: 200,
      result: {
        module,
        input: text,
        to: toValue,
        output: data.message,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      code: error.response?.status || 500,
      result: {
        error: error.response?.data?.message || error.message || "Error bree..",
      },
    };
  }
}

// --- API Route Handlers ---

// ---------- GET handler ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const module = searchParams.get("module");
    const to = searchParams.get("to");
    const customTone = searchParams.get("customTone");

    const result = await processCopilotRequest(text, module, to, customTone);

    if (result.success) {
      return NextResponse.json({
        success: true,
        creator: "Ahzamycode",
        data: result.result,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.result.error },
        { status: result.code }
      );
    }
  } catch (error: any) {
    console.error("Error in GET /api/ai/copilot:", error.message);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

// ---------- POST handler ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, module, to, customTone } = body;

    const result = await processCopilotRequest(text, module, to, customTone);

    if (result.success) {
      return NextResponse.json({
        success: true,
        creator: "Ahzamycode",
        data: result.result,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.result.error },
        { status: result.code }
      );
    }
  } catch (error: any) {
    console.error("Error in POST /api/ai/copilot:", error.message);
    // Menangani error jika body bukan JSON
    if (error instanceof SyntaxError && error.message.includes("Unexpected token")) {
        return NextResponse.json(
            { success: false, error: "Request body harus berupa JSON yang valid." },
            { status: 400 }
        );
    }
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}