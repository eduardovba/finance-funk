import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/users";
import { z } from 'zod';
import { validateBody } from '@/lib/validation';

export const RegisterSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
}).refine(data => data!.password === data!.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: unknown = await request.json();
        const { data, error } = validateBody(RegisterSchema, body);
        if (error) return NextResponse.json({ error }, { status: 400 });

        // Check if user already exists
        const existingUser = await findUserByEmail(data!.email);
        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }

        // Create user
        const user = await createUser({ name: data!.name, email: data!.email, password: data!.password });

        return NextResponse.json(
            { message: "Account created successfully.", user: { id: user.id, name: user.name, email: user.email } },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
