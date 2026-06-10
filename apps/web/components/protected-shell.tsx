// apps/web/components/protected-shell.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import type { User } from '../lib/types';

const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/patients', label: 'Patients' },
    { href: '/appointments', label: 'Appointments' },
    { href: '/reminders', label: 'Reminders' },
    { href: '/clinic', label: 'Clinic' },
];

export default function ProtectedShell({
    user,
    children,
}: {
    user: User;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(true);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside
                className={`${open ? 'w-56' : 'w-16'
                    } flex flex-col bg-white border-r border-gray-200 transition-all duration-200`}
            >
                {/* Logo */}
                <div className="flex items-center h-16 px-4 border-b border-gray-200">
                    {open && (
                        <span className="text-lg font-semibold text-blue-600">
                            ASA AI
                        </span>
                    )}
                    <button
                        onClick={() => setOpen(!open)}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                        {open ? '←' : '→'}
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 space-y-1 px-2">
                    {navItems.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {open ? item.label : item.label[0]}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-gray-200 flex items-center gap-3">
                    <UserButton afterSignOutUrl="/sign-in" />
                    {open && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-700 truncate">
                                {user.firstName ?? user.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.role}</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
    );
}