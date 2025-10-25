import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ReminiResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter url is required' },
        { status: 400 }
      );
    }

    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://api.ryzumi.vip/api/ai/remini?url=${encodedUrl}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: ReminiResponse = await response.json();
    
    return NextResponse.json<ApiResponse<ReminiResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in remini API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}