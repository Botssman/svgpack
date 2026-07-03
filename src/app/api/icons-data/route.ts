import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'index';
  
  try {
    const filePath = join(process.cwd(), 'public', 'icons', `${category}.json`);
    const buffer = await readFile(filePath);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
}

export const dynamic = 'force-dynamic';
