// apps/web/app/(protected)/appointments/appointments-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Appointment, Patient } from '../../../lib/types';

const APPOINTMENT_TYPES = [
    'CHECKUP',
    'CLEANING',
    'FILLING',
    'EXTRACTION',
    'ROOT_CANAL',
    'CROWN',
    'CONSULTATION',
    'EMERGENCY',
    'OTHER',
];

const STATUS_STYLES: Record<string, string> = {
    SCHEDULED: 'bg-[#E3EBE9] text-[#1C3D3A]',
    CONFIRMED: 'bg-[#E7F5EC] text-[#1F9D55]',
    CANCELLED: 'bg-[#F3F0E9] text-[#1C3D3A99]',
    NO_SHOW: 'bg-[#FBEAE9] text-[#C23B3B]',
    COMPLETED: 'bg-[#F0F2E3] text-[#7C8B3D]',
    RESCHEDULED: 'bg-[#F5E8E3] text-[#B55538]',
};

function AppointmentModal({
    clinicId,
    patients,
    onClose,
    onCreated,
    api,
}: {
    clinicId: string;
    patients: Patient[];
    onClose: () => void;
    onCreated: (a: Appointment) => void;
        api: ReturnType<typeof useApi>;
}) {
    const [form, setForm] = useState({
        patientId: '',
        appointmentType: 'CHECKUP',
        scheduledAt: '',
        durationMins: '30',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const appointment = await api.post<Appointment>('/appointments', {
                clinicId,
                patientId: form.patientId,
                appointmentType: form.appointmentType,
                scheduledAt: new Date(form.scheduledAt).toISOString(),
                durationMins: parseInt(form.durationMins),
                notes: form.notes || undefined,
            });
            onCreated(appointment);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C3D3A]/40">
            <div className="w-full max-w-md rounded-xl border border-[#E4E0D6] bg-white p-6 shadow-xl">
                <h2 className="mb-5 text-lg font-bold text-[#1C3D3A]">
                    New appointment
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Patient <span className="text-[#C23B3B]">*</span>
                        </label>
                        <select
                            required
                            value={form.patientId}
                            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        >
                            <option value="">Select a patient</option>
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.firstName} {p.lastName} — {p.phone}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Type <span className="text-[#C23B3B]">*</span>
                        </label>
                        <select
                            required
                            value={form.appointmentType}
                            onChange={(e) =>
                                setForm({ ...form, appointmentType: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        >
                            {APPOINTMENT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Date & time <span className="text-[#C23B3B]">*</span>
                        </label>
                        <input
                            required
                            type="datetime-local"
                            value={form.scheduledAt}
                            onChange={(e) =>
                                setForm({ ...form, scheduledAt: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Duration (minutes)
                        </label>
                        <select
                            value={form.durationMins}
                            onChange={(e) =>
                                setForm({ ...form, durationMins: e.target.value })
                            }
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        >
                            {[15, 30, 45, 60, 90, 120].map((m) => (
                                <option key={m} value={m}>
                                    {m} min
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Notes
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-[#FBEAE9] px-3 py-2 text-sm text-[#C23B3B]">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-[#E4E0D6] px-4 py-2 text-sm font-bold text-[#1C3D3A] transition-colors hover:bg-[#F3F0E9]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-lg bg-[#B55538] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#9c4730] disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Book appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AppointmentsClient({
    user,
    initialAppointments,
    patients,
}: {
    user: User;
    initialAppointments: Appointment[];
    patients: Patient[];
}) {
    const api = useApi();
    const [appointments, setAppointments] = useState(initialAppointments);
    const [showModal, setShowModal] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(false);

    async function applyFilters(date: string, status: string) {
        if (!user.clinicId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ clinicId: user.clinicId });
            if (date) params.set('date', date);
            if (status) params.set('status', status);
            const results = await api.get<Appointment[]>(
                `/appointments?${params.toString()}`,
            );
            setAppointments(results);
        } finally {
            setLoading(false);
        }
    }

    function handleDateChange(date: string) {
        setFilterDate(date);
        applyFilters(date, filterStatus);
    }

    function handleStatusChange(status: string) {
        setFilterStatus(status);
        applyFilters(filterDate, status);
    }

    function handleCreated(appointment: Appointment) {
        setAppointments((prev) => [appointment, ...prev]);
    }

    return (
        <div className="w-full max-w-none space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="patient-title text-lg font-extrabold">Appointments</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="rounded-lg bg-[#B55538] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#9c4730]"
                >
                    + New appointment
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                >
                    <option value="">All statuses</option>
                    {Object.keys(STATUS_STYLES).map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                {(filterDate || filterStatus) && (
                    <button
                        onClick={() => {
                            setFilterDate('');
                            setFilterStatus('');
                            applyFilters('', '');
                        }}
                        className="text-sm text-[#1C3D3A66] hover:text-[#1C3D3A]"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-[10px] border border-[#E4E0D6] bg-white">
                {loading ? (
                    <p className="px-5 py-8 text-center text-sm text-[#1C3D3A99]">
                        Loading...
                    </p>
                ) : appointments.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-[#1C3D3A99]">
                        No appointments found.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#E4E0D6] text-left text-xs text-[#1C3D3A66]">
                                <th className="px-5 py-3 font-medium">Patient</th>
                                <th className="px-5 py-3 font-medium">Type</th>
                                <th className="px-5 py-3 font-medium">Date & time</th>
                                <th className="px-5 py-3 font-medium">Duration</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a) => (
                                <tr
                                    key={a.id}
                                    className="border-b border-[#E4E0D6] last:border-0 hover:bg-[#F3F0E9]"
                                >
                                    <td className="px-5 py-3 font-bold text-[#1C3D3A]">
                                        {a.patient
                                            ? `${a.patient.firstName} ${a.patient.lastName}`
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-[#1C3D3A99]">
                                        {a.appointmentType.replace('_', ' ')}
                                    </td>
                                    <td className="px-5 py-3 text-[#1C3D3A99]">
                                        {new Date(a.scheduledAt).toLocaleString('en-ZA', {
                                            timeZone: 'Africa/Johannesburg',
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td className="px-5 py-3 text-[#1C3D3A99]">
                                        {a.durationMins} min
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                                STATUS_STYLES[a.status] ?? 'bg-[#F3F0E9] text-[#1C3D3A99]'
                                            }`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && user.clinicId && (
                <AppointmentModal
                    clinicId={user.clinicId}
                    patients={patients}
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                    api={api}
                />
            )}
        </div>
    );
}