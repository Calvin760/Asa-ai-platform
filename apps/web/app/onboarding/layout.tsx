// app/onboarding/layout.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { User } from '@/lib/types';
import { serverApi } from '@/lib/api.server';


export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    // Must be signed in to onboard
    if (!userId) redirect('/sign-in');

    // Already onboarded → go to dashboard
    try {
        const user = await serverApi.get<User>(`/users/clerk/${userId}`);
        if (user?.clinicId) redirect('/dashboard');
    } catch {
        // No DB user yet — that's fine, let them onboard
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-lg px-4">
                {children}
            </div>
        </main>
    );
}