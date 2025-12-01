import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = 'https://api.datamartgh.shop';

async function proxyRequest(request, path) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value || 
                  request.headers.get('x-auth-token') ||
                  request.headers.get('authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['x-auth-token'] = token.startsWith('Bearer ') ? token.slice(7) : token;
    }

    // Build the full URL with query parameters
    const url = new URL(request.url);
    const queryString = url.search;
    const fullUrl = `${API_BASE}/api/${path}${queryString}`;

    const options = {
      method: request.method,
      headers,
    };

    // Handle request body for POST, PUT, PATCH, DELETE
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          options.body = body;
        }
      } catch (e) {
        // No body to parse
      }
    }

    console.log(`[Proxy] ${request.method} ${fullUrl}`);
    
    const response = await fetch(fullUrl, options);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // For non-JSON responses (like file downloads), return as-is
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': response.headers.get('content-disposition') || '',
        },
      });
    }
  } catch (error) {
    console.error('[Proxy Error]:', error);
    return NextResponse.json(
      { status: 'error', msg: error.message || 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  const path = params.path?.join('/') || '';
  return proxyRequest(request, path);
}

export async function POST(request, { params }) {
  const path = params.path?.join('/') || '';
  return proxyRequest(request, path);
}

export async function PUT(request, { params }) {
  const path = params.path?.join('/') || '';
  return proxyRequest(request, path);
}

export async function DELETE(request, { params }) {
  const path = params.path?.join('/') || '';
  return proxyRequest(request, path);
}

export async function PATCH(request, { params }) {
  const path = params.path?.join('/') || '';
  return proxyRequest(request, path);
}