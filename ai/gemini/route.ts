import { NextResponse } from "next/server";

let sessions: Record<string, any> = {};

const gemini = {
  getNewCookie: async () => {
    const r = await fetch(
      "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c",
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
        method: "POST",
      }
    );
    const ck = r.headers.get("set-cookie");
    if (!ck) throw Error("cookie kosong");
    return ck.split(";")[0];
  },

  ask: async (prompt: string, prev: string | null = null) => {
    if (!prompt?.trim()) throw Error("mana prompt nya?");
    let r = null,
      c = null;
    if (prev) {
      let j = JSON.parse(atob(prev));
      r = j.newResumeArray;
      c = j.cookie;
    }
    const h = {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "x-goog-ext-525001261-jspb":
        '[1,null,null,null,"9ec249fc9ad08861",null,null,null,[4]]',
      cookie: c || (await gemini.getNewCookie()),
    };
    const b = [[prompt], ["en-US"], r],
      a = [null, JSON.stringify(b)],
      body = new URLSearchParams({ "f.req": JSON.stringify(a) });
    const x = await fetch(
      "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=en-US&_reqid=2813378&rt=c",
      { headers: h, body, method: "POST" }
    );
    if (!x.ok)
      throw Error(
        `${x.status} ${x.statusText} ${(await x.text()) || "(body kosong)"}`
      );
    const d = await x.text(),
      m = Array.from(d.matchAll(/^\d+\n(.+?)\n/gm)).reverse()[3][1],
      p1 = JSON.parse(JSON.parse(m)[0][2]);
    return {
      text: p1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, "*$1*"),
      id: btoa(
        JSON.stringify({
          newResumeArray: [...p1[1], p1[4][0][0]],
          cookie: h.cookie,
        })
      ),
    };
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, session, imageUrl, userId } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: text" },
        { status: 400 }
      );
    }

    // kalau ada session dari client, pake itu
    const prev = session || null;

    // kalau ada userId, simpan session per-user (opsional)
    const cache = userId && sessions[userId];
    const prevSession =
      cache && cache.expire > Date.now() ? cache.id : prev;

    const result = await gemini.ask(text, prevSession);

    if (userId) {
      sessions[userId] = { id: result.id, expire: Date.now() + 86400000 };
    }

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      response: result.text,
      session: result.id,
      imageUrl: imageUrl || null,
    });
  } catch (e: any) {
    console.error("gemini error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }

}
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const session = searchParams.get("session");
    const imageUrl = searchParams.get("imageUrl");

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: text" },
        { status: 400 }
      );
    }

    const result = await gemini.ask(text, session);

    return NextResponse.json({
      success: true,
      response: result.text,
      session: result.id,
      imageUrl: imageUrl || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
