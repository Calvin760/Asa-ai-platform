// apps/web/app/(protected)/onboarding/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import type { Clinic, User } from '@/lib/types';
import { useApi } from '@/lib/api.client';

export default function OnboardingPage() {
    const router = useRouter();
    const { user: clerkUser } = useUser();
    const api = useApi();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!clerkUser) return;

        setLoading(true);
        setError('');

        try {
            // Step 1: Create the clinic
            const clinic = await api.post<Clinic>('/clinics', form);

            // Step 2: Get or create the DB user
            let dbUser: User;
            try {
                dbUser = await api.get<User>(`/users/clerk/${clerkUser.id}`);
            } catch {
                // User not in DB yet — create them now
                // This handles the case where the Clerk webhook is disabled
                dbUser = await api.post<User>('/users', {
                    email: clerkUser.emailAddresses[0]?.emailAddress,
                    clerkUserId: clerkUser.id,
                    firstName: clerkUser.firstName ?? undefined,
                    lastName: clerkUser.lastName ?? undefined,
                    role: 'ADMIN',
                });
            }

            // Step 3: Link clinic to user
            await api.patch(`/users/${dbUser.id}`, { clinicId: clinic.id });


            // Step 5: Navigate to dashboard
            // Use replace() so the back button doesn't return to onboarding
            router.replace('/dashboard');
            // Step 4: Force server components to re-fetch fresh data
            // Without router.refresh(), the layout still sees the old cached
            // user (clinicId = null) and bounces back to /onboarding
            router.refresh();


        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-[#FAF8F4] px-4 py-10 sm:items-center sm:py-12">
            <div className="w-full max-w-lg">
                <h1 className="mb-2 text-xl font-bold text-[#1C3D3A] sm:text-2xl">
                    Set up your clinic
                </h1>
                <p className="mb-6 text-sm text-[#1C3D3A99] sm:mb-8 sm:text-base">
                    This only takes a minute. You can update these details later.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-[10px] border border-[#E4E0D6] bg-white p-5 sm:p-6"
                >
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Clinic name <span className="text-[#C23B3B]">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Smile Dental Clinic"
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Phone
                        </label>
                        <input
                            type="text"
                            inputMode="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+27821234567"
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="info@yourclinic.co.za"
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#1C3D3A]">
                            Address
                        </label>
                        <input
                            type="text"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="123 Main St, Johannesburg"
                            className="w-full rounded-lg border border-[#E4E0D6] px-3 py-2 text-sm text-[#1C3D3A] focus:outline-none focus:ring-2 focus:ring-[#B55538]/30"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-[#FBEAE9] px-3 py-2 text-sm text-[#C23B3B]">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !form.name}
                        className="w-full rounded-lg bg-[#B55538] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#9c4730] disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Create clinic'}
                    </button>
                </form>
            </div>
        </div>
    );
}