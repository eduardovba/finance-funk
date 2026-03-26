import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { deleteUserAndData } from '@/lib/users';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

const DeleteAccountSchema = z.object({
    confirmation: z.literal('DELETE'),
});

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const sessionUser = await requireAuth();

        const body: unknown = await request.json();
        const { data, error } = validateBody(DeleteAccountSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        await deleteUserAndData(sessionUser.id);

        return NextResponse.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error deleting user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
