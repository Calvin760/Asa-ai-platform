// apps/web/app/(protected)/patients/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User, Patient } from '../../../lib/types';
import PatientsClient from './patients-client';

export default async function PatientsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await serverApi.get<User>(`/users/clerk/${userId}`);
    if (!user.clinicId) redirect('/onboarding');

    const patients = await serverApi
        .get<Patient[]>(`/patients?clinicId=${user.clinicId}`)
        .catch(() => []);

    return <PatientsClient user={user} initialPatients={patients} />;
}