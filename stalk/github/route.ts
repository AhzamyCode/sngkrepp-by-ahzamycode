/**
 * @route /api/stalk/github
 * @method GET / POST
 * @desc Ambil informasi profil GitHub publik dari username.
 * @author Ahzamy
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

async function githubStalk(user: string) {
  try {
    const { data } = await axios.get(`https://api.github.com/users/${user}`);
    return {
      username: data.login || null,
      nickname: data.name || null,
      bio: data.bio || null,
      id: data.id || null,
      nodeId: data.node_id || null,
      profile_pic: data.avatar_url || null,
      url: data.html_url || null,
      type: data.type || null,
      admin: data.site_admin || false,
      company: data.company || null,
      blog: data.blog || null,
      location: data.location || null,
      email: data.email || null,
      public_repo: data.public_repos || 0,
      public_gists: data.public_gists || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      created_at: data.created_at || null,
      updated_at: data.updated_at || null,
    };
  } catch (error: any) {
    throw new Error("User not found or API error: " + error.message);
  }
}

// =============== GET Method ===============
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");

  if (!user)
    return NextResponse.json({ success: false, error: "Parameter 'user' is required" }, { status: 400 });

  try {
    const result = await githubStalk(user);
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// =============== POST Method ===============
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type");
    let user: string | null = null;

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      user = body.user;
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      user = formData.get("user") as string;
    }

    if (!user)
      return NextResponse.json({ success: false, error: "Parameter 'user' is required" }, { status: 400 });

    const result = await githubStalk(user.trim());
    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
