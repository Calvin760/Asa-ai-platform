// apps/web/components/protected-shell.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import type { User } from '../lib/types';

const navItems = [
    { href: '/dashboard',    label: 'Dashboard',    icon: 'ti-layout-dashboard' },
    { href: '/patients',     label: 'Patients',     icon: 'ti-users' },
    { href: '/appointments', label: 'Appointments', icon: 'ti-calendar' },
    { href: '/reminders',    label: 'Reminders',    icon: 'ti-bell' },
];

const clinicItems = [
    { href: '/clinic', label: 'Settings', icon: 'ti-building-hospital' },
];

const allItems = [...navItems, ...clinicItems];

function pageTitle(pathname: string) {
    const match = allItems.find((item) => pathname.startsWith(item.href));
    return match?.label ?? 'Dashboard';
}

// Palette — warm clinical paper, not the default SaaS navy/indigo.
const ink = '#1C3D3A';        // deep teal-ink, used for text & wordmark
const inkSoft = '#1C3D3A99';  // muted ink for inactive labels
const inkFaint = '#1C3D3A55'; // faint ink for icons at rest
const paper = '#FAF8F4';      // warm paper background (page + sidebar)
const paperLine = '#E4E0D6';  // hairline divider, like a folder edge
const clay = '#B55538';       // accent — terracotta, not blue
const clayTint = '#B5553814'; // active-row wash

export default function ProtectedShell({
    user,
    children,
}: {
    user: User;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(true);
    const [runningAgent, setRunningAgent] = useState(false);

    const initials = [user.firstName, user.lastName]
        .filter(Boolean)
        .map((n) => n![0])
        .join('')
        .toUpperCase() || user.email[0].toUpperCase();

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    return (
        <div style={{ display: 'flex', height: '100vh', background: paper }}>

            {/* ── Sidebar ── */}
            <aside style={{
                width: open ? 224 : 56,
                minWidth: open ? 224 : 56,
                background: paper,
                borderRight: `1px solid ${paperLine}`,
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                overflow: 'hidden',
            }}>

                {/* Logo */}
                <div style={{
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderBottom: `1px solid ${paperLine}`,
                    gap: 10,
                    flexShrink: 0,
                }}>
                    <div style={{
                        width: 28, height: 28, minWidth: 28,
                        background: ink,
                        borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <i className="ti ti-heartbeat" style={{ fontSize: 14, color: paper }} aria-hidden />
                    </div>
                    {open && (
                        <span style={{ fontSize: 14, fontWeight: 600, color: ink, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                            ASA <span style={{ color: clay }}>AI</span>
                        </span>
                    )}
                    <button
                        onClick={() => setOpen(!open)}
                        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
                        style={{
                            marginLeft: 'auto',
                            width: 24, height: 24, minWidth: 24,
                            border: `1px solid ${paperLine}`,
                            background: 'transparent',
                            borderRadius: 4,
                            color: inkSoft,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12,
                        }}
                    >
                        <i className={open ? 'ti ti-chevrons-left' : 'ti ti-chevrons-right'} aria-hidden />
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                    {open && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: inkFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 10px 4px' }}>
                            Main
                        </div>
                    )}
                    {navItems.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 6,
                                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                                position: 'relative',
                                background: active ? clayTint : 'transparent',
                            }}>
                                {active && (
                                    /* Folder-tab notch instead of the generic left accent bar */
                                    <span style={{
                                        position: 'absolute', right: -1, top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 4, height: 14,
                                        background: clay, borderRadius: '2px 0 0 2px',
                                    }} />
                                )}
                                <i className={`ti ${item.icon}`} style={{
                                    fontSize: 16, minWidth: 16,
                                    color: active ? clay : inkFaint,
                                }} aria-hidden />
                                {open && (
                                    <span style={{
                                        fontSize: 13,
                                        color: active ? ink : inkSoft,
                                        fontWeight: active ? 600 : 400,
                                    }}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {open && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: inkFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 10px 4px' }}>
                            Clinic
                        </div>
                    )}
                    {clinicItems.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 6,
                                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                                position: 'relative',
                                background: active ? clayTint : 'transparent',
                            }}>
                                {active && (
                                    <span style={{
                                        position: 'absolute', right: -1, top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 4, height: 14,
                                        background: clay, borderRadius: '2px 0 0 2px',
                                    }} />
                                )}
                                <i className={`ti ${item.icon}`} style={{
                                    fontSize: 16, minWidth: 16,
                                    color: active ? clay : inkFaint,
                                }} aria-hidden />
                                {open && (
                                    <span style={{
                                        fontSize: 13,
                                        color: active ? ink : inkSoft,
                                        fontWeight: active ? 600 : 400,
                                    }}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div style={{ padding: '12px 8px', borderTop: `1px solid ${paperLine}`, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, overflow: 'hidden' }}>
                        <UserButton afterSignOutUrl="/sign-in" />
                        {open && (
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {displayName}
                                </div>
                                <div style={{ fontSize: 11, color: inkFaint, textTransform: 'capitalize' }}>
                                    {user.role?.toLowerCase() ?? 'admin'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: paper }}>

                {/* Topbar */}
                <header style={{
                    height: 56,
                    minHeight: 56,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    borderBottom: `1px solid ${paperLine}`,
                    gap: 12,
                    flexShrink: 0,
                }}>
                    <h1 style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: ink,
                        letterSpacing: '-0.01em',
                        margin: 0,
                        whiteSpace: 'nowrap',
                    }}>
                        {pageTitle(pathname)}
                    </h1>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => setRunningAgent(!runningAgent)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px',
                                border: `1px solid ${paperLine}`,
                                borderRadius: 7,
                                background: paper,
                                color: ink,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <i className={runningAgent ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'} style={{ fontSize: 13, color: clay }} aria-hidden />
                            {runningAgent ? 'Stop agent' : 'Run agent'}
                        </button>

                        <span
                            aria-label="Agent status"
                            title={runningAgent ? 'Agent running' : 'Agent idle'}
                            style={{
                                width: 8, height: 8, minWidth: 8,
                                borderRadius: '50%',
                                background: runningAgent ? '#1F9D55' : clay,
                            }}
                        />
                    </div>
                </header>

                {/*
                  Content area — this is what actually wraps every page's
                  content. This was previously bare (flex: 1, overflow: auto
                  only), so every padding value set in globals.css under
                  .content-area had ZERO effect here, since this <main> never
                  used that className — it's a plain inline-styled element.
                  Padding now lives directly here, where the markup actually
                  renders.
                */}
                <main style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '32px 40px',
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}