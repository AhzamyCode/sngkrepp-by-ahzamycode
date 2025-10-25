/**
 * CR Ahzamycode
 * API: /api/stalk/instagram
 * Desc: Mendapatkan informasi profil Instagram, statistik post, stories, dan latest posts
 * Original scrapper by: Anomaki Team
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * Fungsi utama untuk mengambil informasi profil Instagram
 */
async function stalkIg(username: string): Promise<any> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'origin': 'https://bitchipdigital.com',
    'referer': 'https://bitchipdigital.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };

  try {
    // Request 1: Ambil info profil
    const profileRes = await axios.post(
      'https://tools.xrespond.com/api/instagram/profile-info',
      new URLSearchParams({ profile: username }).toString(),
      { headers, timeout: 30000 }
    );

    const profileJson = profileRes.data;
    const raw = profileJson?.data?.data;

    if (!raw || profileJson.status !== 'success') {
      return { error: true, message: 'Gagal mengambil data profil' };
    }

    const followers = raw.follower_count || 0;

    // Request 2: Ambil info post
    const postsRes = await axios.post(
      'https://tools.xrespond.com/api/instagram/media/posts',
      new URLSearchParams({ profile: username }).toString(),
      { headers, timeout: 30000 }
    );

    const postsJson = postsRes.data;
    const items = postsJson?.data?.data?.items || [];

    let totalLike = 0;
    let totalComment = 0;
    for (const post of items) {
      totalLike += post.like_count || 0;
      totalComment += post.comment_count || 0;
    }

    const totalEngagement = totalLike + totalComment;
    let averageEngagementRate = 0.0;
    if (followers > 0 && items.length > 0) {
      averageEngagementRate = (totalEngagement / items.length) / followers * 100.0;
    }

    const result = {
      username: raw.username || '-',
      name: raw.full_name || '-',
      bio: raw.biography || '-',
      followers: followers,
      following: raw.following_count,
      posts: raw.media_count,
      profile_pic: raw.hd_profile_pic_url_info?.url || raw.profile_pic_url_hd || '',
      verified: !!(raw.is_verified || raw.show_blue_badge_on_main_profile),
      engagement_rate: parseFloat(averageEngagementRate.toFixed(2))
    };

    return result;

  } catch (error: any) {
    console.error("Error in stalkIg:", error.message);
    return { error: true, message: error.message || 'Terjadi kesalahan saat mengambil data Instagram' };
  }
}

/**
 * Fungsi tambahan untuk ambil stories & latest posts via free-tools-api
 */
async function igstalkExtras(username: string) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };

    const [st, pt] = await Promise.all([
      axios.post('https://free-tools-api.vercel.app/api/instagram-viewer', 
        { username: username, type: 'stories' }, 
        { headers }
      ),
      axios.post('https://free-tools-api.vercel.app/api/instagram-viewer', 
        { username: username, type: 'photo' }, 
        { headers }
      ),
    ]);

    return {
      stories: st.data?.stories || [],
      latest_posts: pt.data?.posts || []
    };
  } catch (error: any) {
    console.error("Error in igstalkExtras:", error.message);
    return { stories: [], latest_posts: [] };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Parameter 'username' wajib diisi" },
        { status: 400 }
      );
    }

    const mainData = await stalkIg(username);
    const extraData = await igstalkExtras(username);

    if (mainData.error) {
      return NextResponse.json(
        { success: false, error: mainData.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      creator: "Ahzamycode",
      data: {
        ...mainData,
        stories: extraData.stories,
        latest_posts: extraData.latest_posts
      }
    });

  } catch (err: any) {
    console.error("Error in /api/stalk/instagram:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Terjadi kesalahan saat mengambil informasi Instagram",
      },
      { status: 500 }
    );
  }
}
