import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const sessionToken = request.headers.get('x-session-token');

    const response = await fetch('https://datastoregh.com/agent/', {
      method: 'POST',
      headers: {
        'Cookie': `PHPSESSID=${sessionToken}`
      },
      body: formData,
      credentials: 'include'
    });

    const text = await response.text();
    
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}