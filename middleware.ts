import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting (Note: resets on server restart/re-deploy)
// In production, use Redis or a similar store.
const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

const LIMIT = 100; // max 100 requests
const WINDOW = 60 * 1000; // per 1 minute

export function middleware(request: NextRequest) {
    // Only apply to API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'anonymous';
        const now = Date.now();

        let entry = rateLimitMap.get(ip);

        if (!entry || (now - entry.lastReset) > WINDOW) {
            entry = { count: 1, lastReset: now };
        } else {
            entry.count++;
        }

        rateLimitMap.set(ip, entry);

        if (entry.count > LIMIT) {
            return new NextResponse(
                JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' }),
                {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
