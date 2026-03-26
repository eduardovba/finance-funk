import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { touchLastAccessed } from '@/lib/users';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await touchLastAccessed(session.user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking last accessed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
