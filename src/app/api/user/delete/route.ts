import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { deleteUserAndData } from '@/lib/users';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const sessionUser = await requireAuth();

        const body: unknown = await request.json();
        if ((body as any).confirmation !== 'DELETE') {
            return NextResponse.json(
                { error: 'You must send { "confirmation": "DELETE" } to confirm account deletion' },
                { status: 400 }
            );
        }

        await deleteUserAndData(sessionUser.id);

        return NextResponse.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        if (error instanceof Response) return error as unknown as NextResponse;
        console.error('Error deleting user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
