// apps/web/app/(protected)/clinic/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User, Clinic } from '../../../lib/types';
import ClinicClient from './clinic-client';


export default async function ClinicPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await serverApi.get<User>(`/users/clerk/${userId}`);
    if (!user.clinicId) redirect('/onboarding');

    const clinic = await serverApi.get<Clinic>(
        `/clinics/${user.clinicId}`
    );

    return (
        <ClinicClient
            user={user}
            initialClinic={clinic}
        />
    );
}