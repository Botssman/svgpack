import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = join(process.cwd(), 'public', 'icons-all.zip');
    const fileStat = await stat(filePath);
    
    // Support range requests for large files
    const rangeHeader = request.headers.get('range');
    
    if (rangeHeader) {
      const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (matches) {
        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : fileStat.size - 1;
        const chunkSize = end - start + 1;
        
        const stream = createReadStream(filePath, { start, end });
        
        return new NextResponse(stream as any, {
          status: 206,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="icons-all.zip"',
            'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
            'Content-Length': chunkSize.toString(),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }
    
    // Stream the full file instead of loading into memory
    const stream = createReadStream(filePath);
    
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="icons-all.zip"',
        'Content-Length': fileStat.size.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export const dynamic = 'force-dynamic';
