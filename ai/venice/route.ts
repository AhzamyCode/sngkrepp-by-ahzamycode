/**
 * CR Ahzamycode
 * Scrape Venice Ai Uncensored
 * GET  : /api/ai/venice?query=haloo
 * POST : JSON {query?:<teks>}
 * CH : https://whatsapp.com/channel/0029VbBnJzJ8F2p4xCzrMW2X
 * JANGAN HAPUS WM BANGGG.....
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

async function venicechat(question: string): Promise<string> {
  try {
    if (!question) throw new Error('Question is required');
    
    const { data } = await axios.request({
      method: 'POST',
      url: 'https://outerface.venice.ai/api/inference/chat',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: 'https://venice.ai',
        referer: 'https://venice.ai/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
        'x-venice-version': 'interface@20250523.214528+393d253'
      },
      data: JSON.stringify({
        requestId: 'nekorinn',
        modelId: 'dolphin-3.0-mistral-24b',
        prompt: [
          {
            content: question,
            role: 'user'
          }
        ],
        systemPrompt: '',
        conversationType: 'text',
        temperature: 0.8,
        webEnabled: true,
        topP: 0.9,
        isCharacter: false,
        clientProcessingTime: 15
      })
    });
    
    const chunks = data
      .split('\n')
      .filter((chunk: string) => chunk.trim() !== '') 
      .map((chunk: string) => JSON.parse(chunk));     
      
    const result = chunks
      .map((chunk: { content: string }) => chunk.content)
      .join('');
    
    return result;
  } catch (error: any) {
    console.error("Error in venicechat:", error.message);
    throw new Error(error.message || "Gagal menghubungi AI Venice.");
  }
}
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    if (!query) {
      return NextResponse.json(
        { success: false, error: "Parameter 'query' wajib diisi" },
        { status: 400 }
      );
    }
    const answer = await venicechat(query);
    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: {
        question: query,
        answer: answer,
        model: "dolphin-3.0-mistral-24b"
      },
    });

  } catch (err: any) {
    console.error("Error in /api/ai/venice:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat memproses permintaan ke AI Venice.",
      },
      { status: 500 }
    );
  }
}