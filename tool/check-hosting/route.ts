import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CheckHostingResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter domain is required' },
        { status: 400 }
      );
    }

    const encodedDomain = encodeURIComponent(domain);
    const apiUrl = `https://api.ryzumi.vip/api/tool/check-hosting?domain=${encodedDomain}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: CheckHostingResponse = await response.json();
    
    return NextResponse.json<ApiResponse<CheckHostingResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in check-hosting API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}