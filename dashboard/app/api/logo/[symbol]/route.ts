import { NextRequest, NextResponse } from 'next/server';

function svgBadge(symbol: string): string {
  const sym = symbol.slice(0, 2).toUpperCase();
  const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#F97316'];
  const color = palette[sym.charCodeAt(0) % palette.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="24" fill="${color}"/><text x="24" y="24" dominant-baseline="central" text-anchor="middle" fill="white" font-size="15" font-family="system-ui,sans-serif" font-weight="700">${sym}</text></svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const safe = symbol.replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase();

  try {
    const res = await fetch(`https://financialmodelingprep.com/image-stock/${safe}.png`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }
  } catch {
    // fall through to badge
  }

  return new NextResponse(svgBadge(safe), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
