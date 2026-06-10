// apps/web/app/(protected)/reminders/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../lib/api.server';
import type { User, ReminderLog, AgentRun } from '../../../lib/types';
import RemindersClient from './reminders-client';

export default async function RemindersPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const user = await serverApi.get<User>(`/users/clerk/${userId}`);
    if (!user.clinicId) redirect('/onboarding');

    const [logs, runs] = await Promise.all([
        serverApi
            .get<ReminderLog[]>(`/reminders?clinicId=${user.clinicId}&limit=50`)
            .catch(() => []),
        serverApi
            .get<AgentRun[]>(`/agent/runs?clinicId=${user.clinicId}`)
            .catch(() => []),
    ]);

    return <RemindersClient user={user} initialLogs={logs} initialRuns={runs} />;
}