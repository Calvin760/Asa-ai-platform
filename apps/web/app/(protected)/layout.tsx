// apps/web/app/(protected)/layout.tsx

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

    // Not signed in at all — go to sign-in
    if (!userId) redirect('/sign-in');

    let user: User | null = null;

    try {
        // Try to load the DB user by Clerk ID
        user = await serverApi.get<User>(`/users/clerk/${userId}`);
    } catch {
        // DB user doesn't exist yet (Clerk webhook delay is common on first sign-up)
        // Try to create it now from Clerk data
        try {
            const clerkUser = await currentUser();

            if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
                // Can't create user without email — send to onboarding to retry
                redirect('/onboarding');
            }

            user = await serverApi.post<User>('/users', {
                email: clerkUser.emailAddresses[0].emailAddress,
                clerkUserId: userId,
                firstName: clerkUser.firstName ?? undefined,
                lastName: clerkUser.lastName ?? undefined,
                role: 'ADMIN',
            });
        } catch (createErr: any) {
            // If creation failed because it already exists (race condition with
            // Clerk webhook), try one more fetch before giving up
            try {
                user = await serverApi.get<User>(`/users/clerk/${userId}`);
            } catch {
                // Genuinely can't resolve the user — send to onboarding
                // NOT to sign-in (they are signed in, that would loop)
                redirect('/onboarding');
            }
        }
    }

    if (!user) redirect('/onboarding');

    // User exists but has no clinic yet → onboarding
    if (!user.clinicId) redirect('/onboarding');

    return <ProtectedShell user={user}>{children}</ProtectedShell>;
}