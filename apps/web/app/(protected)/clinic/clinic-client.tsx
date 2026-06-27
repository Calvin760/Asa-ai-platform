// apps/web/app/(protected)/clinic/clinic-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Clinic } from '../../../lib/types';

export default function ClinicClient({
    user,
    initialClinic,
}: {
    user: User;
    initialClinic: Clinic;
}) {
    const api = useApi();

    const [clinic, setClinic] = useState(initialClinic);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function handleChange(
        field: keyof Clinic,
        value: string
    ) {
        setClinic((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSave() {
        if (!user.clinicId) return;

        setSaving(true);
        setError('');

        try {
            const updated = await api.patch<Clinic>(
                `/clinics/${user.clinicId}`,
                clinic
            );

            setClinic(updated);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update clinic');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#1C3D3A]">
                    Clinic settings
                </h1>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-[#B55538] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#9c4730] disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-[#C23B3B]/30 bg-[#FBEAE9] px-4 py-3 text-sm text-[#C23B3B]">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="space-y-5 rounded-[10px] border border-[#E4E0D6] bg-white p-6">

                {/* Clinic Name */}
                <div>
                    <label className="text-sm font-medium text-[#1C3D3A]">
                        Clinic name
                    </label>
                    <input
                        type="text"
                        value={clinic.name ?? ''}
                        onChange={(e) =>
                            handleChange('name', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="text-sm font-medium text-[#1C3D3A]">
                        Phone
                    </label>
                    <input
                        type="text"
                        value={clinic.phone ?? ''}
                        onChange={(e) =>
                            handleChange('phone', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-[#1C3D3A]">
                        Twilio WhatsApp number
                    </label>
                    <input
                        type="text"
                        value={clinic.twilioWhatsAppNumber ?? ''}
                        onChange={(e) =>
                            handleChange('twilioWhatsAppNumber', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="text-sm font-medium text-[#1C3D3A]">
                        Email
                    </label>
                    <input
                        type="email"
                        value={clinic.email ?? ''}
                        onChange={(e) =>
                            handleChange('email', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="text-sm font-medium text-[#1C3D3A]">
                        Address
                    </label>
                    <textarea
                        value={clinic.address ?? ''}
                        onChange={(e) =>
                            handleChange('address', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                    />
                </div>

            </div>
        </div>
    );
}