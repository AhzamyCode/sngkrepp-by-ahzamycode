import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GoogleSearchResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter query is required' },
        { status: 400 }
      );
    }

    const encodedQuery = encodeURIComponent(query);
    const apiUrl = `https://api.ryzumi.vip/api/search/google?query=${encodedQuery}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: GoogleSearchResponse = await response.json();
    
    return NextResponse.json<ApiResponse<GoogleSearchResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in google search API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}