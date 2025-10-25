import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ChatgptResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const prompt = searchParams.get('prompt');
    const imageUrl = searchParams.get('imageUrl');
    const session = searchParams.get('session');

    if (!text) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter text is required' },
        { status: 400 }
      );
    }

    let apiUrl = `https://api.ryzumi.vip/api/ai/v2/chatgpt?text=${encodeURIComponent(text)}`;
    
    if (prompt) apiUrl += `&prompt=${encodeURIComponent(prompt)}`;
    if (imageUrl) apiUrl += `&imageUrl=${encodeURIComponent(imageUrl)}`;
    if (session) apiUrl += `&session=${encodeURIComponent(session)}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: ChatgptResponse = await response.json();
    
    return NextResponse.json<ApiResponse<ChatgptResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in chatgpt API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}