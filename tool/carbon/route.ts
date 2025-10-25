import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CarbonResponse } from '@/types/api';
import { fetchWithHeaders } from '@/lib/fetchWithHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parameter code is required' },
        { status: 400 }
      );
    }

    const encodedCode = encodeURIComponent(code);
    const apiUrl = `https://api.ryzumi.vip/api/tool/carbon?code=${encodedCode}`;
    
    const response = await fetchWithHeaders(apiUrl);
    
    if (!response.ok) {
      throw new Error(`External API returned status: ${response.status}`);
    }
    
    const data: CarbonResponse = await response.json();
    
    return NextResponse.json<ApiResponse<CarbonResponse>>({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in carbon API:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch data from external API' },
      { status: 500 }
    );
  }
}