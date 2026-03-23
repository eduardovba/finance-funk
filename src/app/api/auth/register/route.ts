import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/users";
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { kvSet } from '@/lib/kv';

export const RegisterSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    onboarding_goal: z.string().nullable().optional(),
    onboarding_currency_primary: z.string().nullable().optional(),
    onboarding_currency_secondary: z.string().nullable().optional(),
    onboarding_experience: z.string().nullable().optional(),
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
        const user = await createUser({
            name: data!.name,
            email: data!.email,
            password: data!.password,
            onboarding_goal: data!.onboarding_goal
        });

        // Initialize FTUE state with onboarding data
        const initialFtueState = {
            wizardCompleted: true,
            wizardStep: 0,
            selectedAssetClasses: [],
            timeHorizon: null,
            netWorthTarget: null,
            targetReturn: null,
            usingDemoData: false,
            isTutorialActive: false,
            tutorialStep: 0,
            showCurrencyPicker: false,
            onboardingGoal: data!.onboarding_goal || 'both',
            onboardingExperience: data!.onboarding_experience || 'beginner',
            showFirstVisitGreeting: true,
            checklistItems: {
                setCurrencies: !!data!.onboarding_currency_primary,
                chooseAssets: false,
                setGoals: false,
                addFirstHolding: false,
                recordFirstSnapshot: false,
                setTargets: false,
                exploreForecast: false,
                connectBank: false,
                importHistory: false,
                importBudget: false,
                customiseDashboard: false,
            },
            checklistDismissed: false,
            sidebarDismissed: false,
            pageTutorials: {},
        };

        try {
            await kvSet('ftue_state', initialFtueState, user.id);

            if (data!.onboarding_currency_primary) {
                await kvSet('currency_preferences', {
                    primary: data!.onboarding_currency_primary,
                    secondary: data!.onboarding_currency_secondary || null,
                }, user.id);
            }
        } catch (e) {
            console.error('Failed to initialize FTUE/currency state:', e);
        }

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
