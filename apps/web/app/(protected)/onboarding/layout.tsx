// apps/web/app/(protected)/onboarding/layout.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User } from '../../../lib/types';

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    // Not signed in — go sign in first
    if (!userId) redirect('/sign-in');

    // If user already completed onboarding, skip to dashboard
    // Wrap in try/catch — if DB user doesn't exist yet, show onboarding
    try {
        const user = await serverApi.get<User>(`/users/clerk/${userId}`);
        if (user?.clinicId) redirect('/dashboard');
    } catch {
        // User not in DB yet — let them complete onboarding to create themselves
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-lg px-4">
                {children}
            </div>
        </main>
    );
}