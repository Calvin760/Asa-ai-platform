// apps/web/app/(protected)/patients/patients-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Patient } from '../../../lib/types';

const COUNTRY_CODES = [
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+1', label: 'US / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+49', label: 'Germany (+49)' },
];

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold patient-secondary">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function PatientModal({
  clinicId,
  onClose,
  onCreated,
  api,
}: {
  clinicId: string;
  onClose: () => void;
  onCreated: (p: Patient) => void;
  api: ReturnType<typeof useApi>;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
  });

  const [countryCode, setCountryCode] = useState('+27');
  const [phoneLocal, setPhoneLocal] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError('');

    const digits = phoneLocal.replace(/\D/g, '');

    if (digits.length < 7) {
      setError('Enter a valid phone number, including the area/network code.');
      return;
    }

    const fullPhone = `${countryCode}${digits}`;

    setLoading(true);

    try {
      const patient = await api.post<Patient>('/patients', {
        ...form,
        phone: fullPhone,
        clinicId,
        dateOfBirth: form.dateOfBirth || undefined,
        email: form.email || undefined,
      });

      onCreated(patient);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create patient',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="patient-card w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="patient-title text-lg font-extrabold">
              New patient
            </h2>

            <p className="patient-muted mt-1 text-sm">
              Add patient details to enable reminders and bookings.
            </p>
          </div>

          <button
            onClick={onClose}
            className="patient-secondary-btn grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" required>
              <input
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                className="patient-input"
              />
            </Field>

            <Field label="Last name" required>
              <input
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                className="patient-input"
              />
            </Field>
          </div>

          <Field label="Phone" required>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
                className="patient-input w-[108px] flex-shrink-0 px-2 sm:w-[150px]"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>

              <input
                required
                inputMode="numeric"
                value={phoneLocal}
                placeholder="821234567"
                onChange={(e) =>
                  setPhoneLocal(e.target.value.replace(/\D/g, ''))
                }
                className="patient-input min-w-0 flex-1"
              />
            </div>

            <span className="patient-muted mt-1.5 block text-xs">
              Saved as {countryCode}
              {phoneLocal || '...'}
            </span>
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className="patient-input"
            />
          </Field>

          <Field label="Date of birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) =>
                setForm({ ...form, dateOfBirth: e.target.value })
              }
              className="patient-input"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="patient-secondary-btn flex-1 rounded-lg px-4 py-2 text-sm font-bold"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="patient-primary-btn flex-1 rounded-lg px-4 py-2 text-sm font-extrabold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Create patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getPatientName(patient: Patient) {
  return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();
}

function getInitials(patient: Patient) {
  return `${patient.firstName?.[0] ?? ''}${
    patient.lastName?.[0] ?? ''
  }`.toUpperCase();
}

export default function PatientsClient({
  user,
  initialPatients,
}: {
  user: User;
  initialPatients: Patient[];
}) {
  const api = useApi();

  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searching, setSearching] = useState(false);

  async function handleSearch(q: string) {
    setSearch(q);

    if (!user.clinicId) return;

    setSearching(true);

    try {
      if (!q.trim()) {
        const all = await api.get<Patient[]>(
          `/patients?clinicId=${user.clinicId}`,
        );

        setPatients(all);
      } else {
        const results = await api.get<Patient[]>(
          `/patients/search?clinicId=${user.clinicId}&q=${encodeURIComponent(
            q,
          )}`,
        );

        setPatients(results);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleCreated(patient: Patient) {
    setPatients((prev) => [patient, ...prev]);
  }

  return (
    <div className="w-full max-w-none space-y-5">
      {/* Header */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="patient-title text-lg font-extrabold">
            Patients
          </h1>

          <p className="patient-muted mt-1 text-sm">
            Manage patient records and contact information.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="patient-primary-btn flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold sm:w-auto"
        >
          <i className="ti ti-plus" />
          New patient
        </button>
      </div>

      {/* Search */}

      <div className="patient-card p-4">
        <div className="patient-soft flex items-center gap-3 rounded-lg px-4 py-3">
          <i className="ti ti-search patient-muted" />

          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full min-w-0 bg-transparent text-sm outline-none patient-title placeholder:patient-muted"
          />

          {searching && (
            <span className="patient-accent flex-shrink-0 text-xs font-bold">
              Searching...
            </span>
          )}
        </div>
      </div>

      {/* Patient List */}

      <div className="patient-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--patient-border)] px-5 py-4">
          <h2 className="patient-title text-sm font-extrabold">
            Patient list
          </h2>

          <span className="patient-accent text-sm font-bold">
            {patients.length} total
          </span>
        </div>

        {patients.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="patient-muted text-sm">
              {search
                ? 'No patients found.'
                : 'No patients yet. Add your first patient.'}
            </p>
          </div>
        ) : (
          <div>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="patient-row flex flex-col gap-3 px-5 py-4 sm:grid sm:grid-cols-[1.5fr_1fr_1.2fr_0.8fr] sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="patient-avatar grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-xs font-extrabold">
                    {getInitials(patient)}
                  </div>

                  <div className="min-w-0">
                    <p className="patient-title truncate text-sm font-extrabold">
                      {getPatientName(patient)}
                    </p>

                    <p className="patient-muted truncate text-xs">
                      Patient record
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div>
                    <span className="patient-muted mb-0.5 block text-[10px] font-bold uppercase tracking-wide sm:hidden">
                      Phone
                    </span>
                    <span className="patient-secondary block truncate text-sm">
                      {patient.phone}
                    </span>
                  </div>

                  <div>
                    <span className="patient-muted mb-0.5 block text-[10px] font-bold uppercase tracking-wide sm:hidden">
                      Email
                    </span>
                    <span className="patient-muted block truncate text-sm">
                      {patient.email ?? '—'}
                    </span>
                  </div>

                  <div>
                    <span className="patient-muted mb-0.5 block text-[10px] font-bold uppercase tracking-wide sm:hidden">
                      Date of birth
                    </span>
                    <span className="patient-muted block text-sm">
                      {patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString(
                            'en-ZA',
                          )
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && user.clinicId && (
        <PatientModal
          clinicId={user.clinicId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          api={api}
        />
      )}
    </div>
  );
}