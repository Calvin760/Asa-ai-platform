// apps/web/components/protected-shell.tsx
'use client';

import { useEffect, useState } from 'react';
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

// Below this width the sidebar becomes an off-canvas drawer instead of
// a permanent column, and the topbar swaps to a hamburger trigger.
const MOBILE_BREAKPOINT = 768;

export default function ProtectedShell({
    user,
    children,
}: {
    user: User;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);

    // Desktop: sidebar starts expanded. Mobile: drawer starts closed.
    const [open, setOpen] = useState(true);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [runningAgent, setRunningAgent] = useState(false);

    // Track viewport so we know whether "open" means a docked column
    // (desktop) or an off-canvas drawer (mobile).
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const apply = (matches: boolean) => {
            setIsMobile(matches);
            // Coming from desktop->mobile, the rail should be collapsed
            // by default (it lives off-canvas until opened).
            if (matches) setOpen(true);
        };
        apply(mq.matches);
        const listener = (e: MediaQueryListEvent) => apply(e.matches);
        mq.addEventListener('change', listener);
        return () => mq.removeEventListener('change', listener);
    }, []);

    // Close the mobile drawer whenever the route changes.
    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    // Lock body scroll while the mobile drawer is open.
    useEffect(() => {
        if (isMobile && mobileNavOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [isMobile, mobileNavOpen]);

    const initials = [user.firstName, user.lastName]
        .filter(Boolean)
        .map((n) => n![0])
        .join('')
        .toUpperCase() || user.email[0].toUpperCase();

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    // Sidebar render width logic:
    // - Desktop: collapses to a 56px icon rail or expands to 224px, in-flow.
    // - Mobile: always rendered at 224px, but slides on/off screen via
    //   transform so it never reserves layout space.
    const sidebarWidth = isMobile ? 224 : (open ? 224 : 56);
    const showLabels = isMobile ? true : open;

    const navLink = (item: { href: string; label: string; icon: string }) => {
        const active = pathname.startsWith(item.href);
        return (
            <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', borderRadius: 6,
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
                {showLabels && (
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
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: paper, position: 'relative', overflow: 'hidden' }}>

            {/* ── Mobile backdrop — closes the drawer on tap ── */}
            {isMobile && mobileNavOpen && (
                <div
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(28, 61, 58, 0.35)',
                        zIndex: 40,
                    }}
                />
            )}

            {/* ── Sidebar ── */}
            <aside style={{
                width: sidebarWidth,
                minWidth: sidebarWidth,
                background: paper,
                borderRight: `1px solid ${paperLine}`,
                display: 'flex',
                flexDirection: 'column',
                transition: isMobile ? 'transform 0.2s ease' : 'width 0.2s ease, min-width 0.2s ease',
                overflow: 'hidden',
                ...(isMobile ? {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    zIndex: 50,
                    transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
                    boxShadow: mobileNavOpen ? '4px 0 16px rgba(28, 61, 58, 0.15)' : 'none',
                } : {}),
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
                    {showLabels && (
                        <span style={{ fontSize: 14, fontWeight: 600, color: ink, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                            ASA <span style={{ color: clay }}>AI</span>
                        </span>
                    )}

                    {/* Desktop collapse toggle (hidden on mobile — the drawer
                        is opened/closed from the topbar hamburger / backdrop instead) */}
                    {!isMobile && (
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
                    )}

                    {/* Mobile close (X) button */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileNavOpen(false)}
                            aria-label="Close menu"
                            style={{
                                marginLeft: 'auto',
                                width: 28, height: 28, minWidth: 28,
                                border: `1px solid ${paperLine}`,
                                background: 'transparent',
                                borderRadius: 4,
                                color: inkSoft,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14,
                            }}
                        >
                            <i className="ti ti-x" aria-hidden />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
                    {showLabels && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: inkFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 10px 4px' }}>
                            Main
                        </div>
                    )}
                    {navItems.map(navLink)}

                    {showLabels && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: inkFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 10px 4px' }}>
                            Clinic
                        </div>
                    )}
                    {clinicItems.map(navLink)}
                </nav>

                {/* User footer */}
                <div style={{ padding: '12px 8px', borderTop: `1px solid ${paperLine}`, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, overflow: 'hidden' }}>
                        <UserButton afterSignOutUrl="/sign-in" />
                        {showLabels && (
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
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: paper }}>

                {/* Topbar */}
                <header style={{
                    height: 56,
                    minHeight: 56,
                    display: 'flex',
                    alignItems: 'center',
                    padding: isMobile ? '0 12px' : '0 20px',
                    borderBottom: `1px solid ${paperLine}`,
                    gap: 8,
                    flexShrink: 0,
                }}>
                    {/* Mobile hamburger — opens the drawer */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileNavOpen(true)}
                            aria-label="Open menu"
                            style={{
                                width: 32, height: 32, minWidth: 32,
                                border: `1px solid ${paperLine}`,
                                background: 'transparent',
                                borderRadius: 6,
                                color: ink,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16,
                                flexShrink: 0,
                            }}
                        >
                            <i className="ti ti-menu-2" aria-hidden />
                        </button>
                    )}

                    <h1 style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: ink,
                        letterSpacing: '-0.01em',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                    }}>
                        {pageTitle(pathname)}
                    </h1>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flexShrink: 0 }}>
                        <button
                            onClick={() => setRunningAgent(!runningAgent)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: isMobile ? '7px 10px' : '7px 14px',
                                border: `1px solid ${paperLine}`,
                                borderRadius: 7,
                                background: paper,
                                color: ink,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <i className={runningAgent ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'} style={{ fontSize: 13, color: clay }} aria-hidden />
                            {/* On very narrow screens, show only the icon + status dot to save space */}
                            <span style={isMobile ? { display: 'none' } : undefined}>
                                {runningAgent ? 'Stop agent' : 'Run agent'}
                            </span>
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
                  content. Padding scales down on mobile so cards/tables
                  get usable width instead of the desktop 32/40px gutters.
                */}
                <main style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: isMobile ? '16px' : '32px 40px',
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}