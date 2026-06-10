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
    if (!userId) redirect('/sign-in');

    let user: User | null = null;

    try {
        user = await serverApi.get<User>(`/users/clerk/${userId}`);
    } catch {
        try {
            const clerkUser = await currentUser();
            user = await serverApi.post<User>('/users', {
                email: clerkUser?.emailAddresses?.[0]?.emailAddress,
                clerkUserId: userId,
                firstName: clerkUser?.firstName ?? undefined,
                lastName: clerkUser?.lastName ?? undefined,
                role: 'ADMIN',
            });
        } catch {
            redirect('/sign-in');
        }
    }

    if (!user) redirect('/sign-in');

    // Redirect to onboarding if no clinic — this is now safe
    // because onboarding is outside (protected) and won't loop
    if (!user.clinicId) redirect('/onboarding');

    return <ProtectedShell user={user}>{children}</ProtectedShell>;
}