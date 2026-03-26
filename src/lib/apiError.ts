/**
 * Standardized API error response helper.
 *
 * - Hides internal error details in production
 * - Shows full details in development for debugging
 */

import { NextResponse } from 'next/server';

export function apiError(
    message: string,
    status = 500,
    details?: unknown
): NextResponse {
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
        {
            error: message,
            ...(isDev && details ? { details: details instanceof Error ? details.message : details } : {}),
        },
        { status }
    );
}
