// apps/web/app/(protected)/dashboard/dashboard-client.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../../../lib/api.client';
import type { User, AgentRun, Appointment } from '../../../lib/types';

function StatusBadge({ status }: { status: AgentRun['status'] }) {
  const styles: Record<AgentRun['status'], string> = {
    COMPLETED: 'bg-[#E7F5EC] text-[#1F9D55]',
    RUNNING: 'bg-[#F5E8E3] text-[#8C4129]',
    FAILED: 'bg-[#FBEAE9] text-[#C23B3B]',
    PARTIAL: 'bg-[#F0F2E3] text-[#7C8B3D]',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CONFIRMED: 'bg-[#E7F5EC] text-[#1F9D55]',
    SCHEDULED: 'bg-[#E3EBE9] text-[#1C3D3A]',
    CANCELLED: 'bg-[#FBEAE9] text-[#C23B3B]',
    NO_SHOW: 'bg-[#FBEAE9] text-[#C23B3B]',
    COMPLETED: 'bg-[#F0F2E3] text-[#7C8B3D]',
  };
  const fallback = 'bg-[#F5E8E3] text-[#B55538]';
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
        styles[status] ?? fallback
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  trend,
  trendTone = 'neutral',
}: {
  label: string;
  value: number | string;
  subtext?: string;
  trend?: string;
  trendTone?: 'positive' | 'negative' | 'neutral';
}) {
  const trendColor =
    trendTone === 'positive'
      ? 'text-[#1F9D55]'
      : trendTone === 'negative'
        ? 'text-[#C23B3B]'
        : 'text-[#1C3D3A99]';

  return (
    <div className="min-h-[124px] rounded-[10px] border border-[#E4E0D6] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1C3D3A66]">
        {label}
      </p>

      <p className="mt-2 text-[26px] font-extrabold leading-none text-[#1C3D3A]">
        {value}
      </p>

      <p
        className={`mt-3 text-xs ${
          trend ? `font-bold ${trendColor}` : 'text-[#1C3D3A99]'
        }`}
      >
        {trend ?? subtext}
      </p>
    </div>
  );
}

function getPatientName(appointment: Appointment) {
  const patient = appointment.patient;
  if (!patient) return 'Unknown patient';

  const fullName = `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();
  return fullName || patient.phone || 'Unknown patient';
}

function UpcomingAppointmentRow({ appointment }: { appointment: Appointment }) {
  const scheduled = new Date(appointment.scheduledAt);

  const dateLabel = scheduled.toLocaleDateString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const timeLabel = scheduled.toLocaleTimeString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[9px] border border-[#E4E0D6] bg-white px-4 py-3 sm:gap-4">
      <div className="w-[88px] shrink-0">
        <p className="text-sm font-bold text-[#1C3D3A]">{dateLabel}</p>
        <p className="text-xs text-[#1C3D3A99]">{timeLabel}</p>
      </div>

      <div className="min-w-0 flex-1 basis-[140px]">
        <p className="truncate text-sm font-extrabold text-[#1C3D3A]">
          {getPatientName(appointment)}
        </p>
        <p className="truncate text-xs text-[#1C3D3A99]">
          {appointment.appointmentType} · {appointment.durationMins} min
        </p>
      </div>

      <AppointmentStatusBadge status={appointment.status} />
    </div>
  );
}

export default function DashboardClient({
  user,
  runs: initialRuns,
  appointments = [],
}: {
  user: User;
  runs: AgentRun[];
  appointments?: Appointment[];
}) {
  const api = useApi();
  const [runs, setRuns] = useState(initialRuns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lastRun = runs[0];
  const totalRuns = runs.length;
  const totalSent = runs.reduce((sum, r) => sum + r.remindersSent, 0);
  const totalAttempted = runs.reduce((sum, r) => sum + r.remindersAttempted, 0);
  const totalFailed = runs.reduce((sum, r) => sum + r.remindersFailed, 0);

  const successRate =
    totalAttempted > 0 ? Math.round((totalSent / totalAttempted) * 100) : 0;

  const now = Date.now();
  const upcomingAppointments = appointments
    .filter((appointment) => new Date(appointment.scheduledAt).getTime() >= now)
    .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status))
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, 3);

  async function triggerAgent() {
    if (!user.clinicId) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/agent/run/${user.clinicId}/mock`, {});
      const updated = await api.get<AgentRun[]>(
        `/agent/runs?clinicId=${user.clinicId}`,
      );
      setRuns(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setLoading(false);
    }
  }

  const lastRunTime = lastRun
    ? new Date(lastRun.startedAt).toLocaleString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="w-full max-w-none space-y-6">
      {error && (
        <div className="rounded-lg border border-[#C23B3B]/30 bg-[#FBEAE9] px-4 py-3 text-sm text-[#C23B3B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total runs" value={totalRuns} subtext="All time" />

        <MetricCard
          label="Reminders sent"
          value={totalSent}
          trend={totalRuns > 0 ? `${successRate}% success rate` : undefined}
          trendTone="positive"
        />

        <MetricCard
          label="Failed"
          value={totalFailed}
          subtext={totalFailed > 0 ? 'Needs attention' : 'None so far'}
          trend={totalFailed > 0 ? `${totalFailed} failed` : undefined}
          trendTone="negative"
        />

        <MetricCard
          label="Last run"
          value={lastRun ? lastRun.status : '—'}
          subtext={lastRunTime ?? 'No runs yet'}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[9px] border border-[#B55538]/25 bg-[#F5E8E3] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-[#8C4129] sm:items-center">
          <i className="ti ti-sparkles mt-0.5 text-base sm:mt-0" />
          <p>
            {lastRun ? (
              <>
                <span className="font-extrabold">
                  {lastRun.status === 'FAILED'
                    ? 'The last run failed.'
                    : `${lastRun.remindersSent} reminders sent`}
                </span>{' '}
                {lastRun.status === 'FAILED'
                  ? 'Run it again or check the error below.'
                  : `in the most recent run, ${lastRunTime}.`}
              </>
            ) : (
              <span className="font-extrabold">No runs yet.</span>
            )}{' '}
            The agent can send reminders automatically.
          </p>
        </div>

        <button
          onClick={triggerAgent}
          disabled={loading}
          className="w-full shrink-0 rounded-lg border border-[#B55538]/40 px-4 py-1.5 text-xs font-extrabold text-[#8C4129] hover:bg-[#EFDCD4] disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Running...' : 'Run now'}
        </button>
      </div>

      {lastRun?.errorMessage && (
        <div className="rounded-[9px] border border-[#C23B3B]/30 bg-[#FBEAE9] px-4 py-3 text-xs text-[#C23B3B]">
          {lastRun.errorMessage}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1C3D3A]">
            Upcoming appointments
          </h2>

          <Link
            href="/appointments"
            className="text-sm font-bold text-[#B55538] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="space-y-2">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-[9px] border border-[#E4E0D6] bg-white px-4 py-8 text-center text-sm text-[#1C3D3A99]">
              No upcoming appointments scheduled.
            </div>
          ) : (
            upcomingAppointments.map((appointment) => (
              <UpcomingAppointmentRow
                key={appointment.id}
                appointment={appointment}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1C3D3A]">Run history</h2>

          <span className="text-sm font-bold text-[#B55538]">
            {totalRuns} total
          </span>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-[#E4E0D6] bg-white">
          {runs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#1C3D3A99]">
              No runs yet. Click &ldquo;Run now&rdquo; to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[#E4E0D6] text-left text-xs text-[#1C3D3A66]">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Trigger</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Sent</th>
                    <th className="px-5 py-3 font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-[#E4E0D6] last:border-0 hover:bg-[#F3F0E9]"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-[#1C3D3A99]">
                        {new Date(run.startedAt).toLocaleString('en-ZA', {
                          timeZone: 'Africa/Johannesburg',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#1C3D3A66]">
                        {run.triggeredBy}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-5 py-3 font-bold text-[#1F9D55]">
                        {run.remindersSent}
                      </td>
                      <td className="px-5 py-3 font-bold text-[#C23B3B]">
                        {run.remindersFailed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}