// apps/web/app/(protected)/appointments/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User, Appointment, Patient } from '../../../lib/types';
import AppointmentsClient from './appointments-client';

export default async function AppointmentsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await serverApi.get<User>(`/users/clerk/${userId}`);
    if (!user.clinicId) redirect('/onboarding');

    const [appointments, patients] = await Promise.all([
        serverApi
            .get<Appointment[]>(`/appointments?clinicId=${user.clinicId}`)
            .catch(() => []),
        serverApi
            .get<Patient[]>(`/patients?clinicId=${user.clinicId}`)
            .catch(() => []),
    ]);

    return (
        <AppointmentsClient
            user={user}
            initialAppointments={appointments}
            patients={patients}
        />
    );
}