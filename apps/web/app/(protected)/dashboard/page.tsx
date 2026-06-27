// apps/web/app/(protected)/dashboard/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User, AgentRun, Appointment } from '../../../lib/types';
import DashboardClient from './dashboard-client';


export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await serverApi.get<User>(`/users/clerk/${userId}`);
  if (!user.clinicId) redirect('/onboarding');

  const [runs, appointments] = await Promise.all([
    serverApi
      .get<AgentRun[]>(`/agent/runs?clinicId=${user.clinicId}`)
      .catch(() => []),
    serverApi
      .get<Appointment[]>(`/appointments?clinicId=${user.clinicId}`)
      .catch(() => []),
  ]);

  return (
    <DashboardClient user={user} runs={runs} appointments={appointments} />
  );
}