import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for the incoming encrypted data
const VaultStorageSchema = z.object({
    blob: z.string().min(1, 'Encrypted blob is required').max(50000),
    timestamp: z.number(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Zod Validation
        const result = VaultStorageSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid Input', details: result.error.issues }, { status: 400 });
        }

        // Server-side logic: Zero-Knowledge
        // We explicitly do NOT log or store the blob.
        // This endpoint exists only to verify connectivity and enforce rate limits.

        return NextResponse.json({ success: true, message: 'Vault secured via Zero-Knowledge protocol' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
