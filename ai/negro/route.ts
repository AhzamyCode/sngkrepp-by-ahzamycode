import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, NegroResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const filter = searchParams.get('filter');

    if (!url) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter url is required' },
        { status: 400 }
      );
    }

    let apiUrl = `https://api.ryzumi.vip/api/ai/negro?url=${encodeURIComponent(url)}`;
    
    if (filter) apiUrl += `&filter=${encodeURIComponent(filter)}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: NegroResponse = await response.json();
    
    return NextResponse.json<ApiResponse<NegroResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in negro API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}