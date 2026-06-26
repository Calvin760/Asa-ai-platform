// app/(protected)/layout.tsx

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../lib/api.server';
import type { User } from '../../lib/types';
import ProtectedShell from '../../components/protected-shell';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    // Not signed in → sign in
    if (!userId) redirect('/sign-in');

    let user: User | null = null;

    try {
        user = await serverApi.get<User>(`/users/clerk/${userId}`);
    } catch {
        // DB user doesn't exist yet — try to create from Clerk data
        try {
            const clerkUser = await currentUser();
            const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
            if (email) {
                user = await serverApi.post<User>('/users', {
                    email,
                    clerkUserId: userId,
                    firstName: clerkUser?.firstName ?? undefined,
                    lastName: clerkUser?.lastName ?? undefined,
                    role: 'ADMIN',
                });
            }
        } catch {
            // Race condition: webhook already created it, try fetching again
            try {
                user = await serverApi.get<User>(`/users/clerk/${userId}`);
            } catch {
                // Give up — send to onboarding to retry
                redirect('/onboarding');
            }
        }
    }

    if (!user) redirect('/onboarding');

    // No clinic yet → onboarding (now safe, onboarding is outside this layout)
    if (!user.clinicId) redirect('/onboarding');

    return <ProtectedShell user={user}>{children}</ProtectedShell>;
}