// apps/web/app/onboarding/layout.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    // NO clinicId check here — that's what was causing the loop
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-lg px-4">
                {children}
            </div>
        </main>
    );
}