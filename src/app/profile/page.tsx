"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Shield, LogOut, Pencil, Check, X,
    Landmark, Calendar, ChevronRight, Settings,
    Lock, Download, Upload, Trash2, AlertTriangle, Eye, EyeOff, ChevronDown, LayoutDashboard
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectedInstitutionsList from '@/components/ConnectedInstitutionsList';
import BankConnectButton from '@/components/BankConnectButton';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { usePortfolio } from '@/context/PortfolioContext';

/* ─── Avatar with fallback ─── */
function ProfileAvatar({ src, name, size = 96 }: any) {
    const [imgError, setImgError] = useState(false);
    const initials = (name || '?')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                onError={() => setImgError(true)}
                className="rounded-full object-cover border-2 border-[#D4AF37]/40"
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className="rounded-full flex items-center justify-center bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 text-[#D4AF37] font-bebas tracking-widest"
            style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
            {initials}
        </div>
    );
}

/* ─── Inline editable name ─── */
function EditableName({ value, onSave }: any) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!draft.trim() || draft.trim() === value) {
            setEditing(false);
            setDraft(value);
            return;
        }
        setSaving(true);
        try {
            await onSave(draft.trim());
            setEditing(false);
        } catch {
            setDraft(value);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <div className="flex items-center gap-2 group">
                <h1 className="text-2xl md:text-3xl font-bebas tracking-widest text-[#D4AF37] m-0 leading-tight">
                    {value}
                </h1>
                <button
                    onClick={() => { setDraft(value); setEditing(true); }}
                    className="p-1.5 rounded-lg bg-transparent text-parchment/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Edit name"
                >
                    <Pencil size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
                className="bg-white/5 border border-[#D4AF37]/30 rounded-lg px-3 py-1.5 text-xl font-bebas tracking-widest text-[#D4AF37] outline-none focus:border-[#D4AF37]/60 w-full max-w-[280px]"
                disabled={saving}
            />
            <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all"
            >
                <Check size={16} />
            </button>
            <button
                onClick={() => { setEditing(false); setDraft(value); }}
                className="p-1.5 rounded-lg bg-white/5 text-parchment/40 hover:text-parchment hover:bg-white/10 transition-all"
            >
                <X size={16} />
            </button>
        </div>
    );
}

/* ─── Section Card Wrapper ─── */
function SectionCard({ title, icon: Icon, children, className = '', variant = 'default' }: any) {
    const borderColor = variant === 'danger' ? 'border-red-500/20' : 'border-white/5';
    const iconBg = variant === 'danger' ? 'bg-red-500/10' : 'bg-[#D4AF37]/10';
    const iconColor = variant === 'danger' ? 'text-red-400' : 'text-[#D4AF37]';
    const titleColor = variant === 'danger' ? 'text-red-400' : 'text-[#D4AF37]';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`glass-card p-0 ${className}`}
        >
            <div className={`px-5 py-4 border-b ${borderColor} flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Icon size={16} className={iconColor} />
                </div>
                <h3 className={`${titleColor} font-bebas text-lg tracking-widest m-0`}>{title}</h3>
            </div>
            <div className="p-5">
                {children}
            </div>
        </motion.div>
    );
}

/* ─── Password Change Form ─── */
function PasswordChangeForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to change password');
            } else {
                setSuccess('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-parchment font-space outline-none focus:border-[#D4AF37]/40 transition-colors";

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
                <input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    required
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/30 hover:text-parchment/60 transition-colors">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>

            <div className="relative">
                <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="New password (min. 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    required
                    minLength={8}
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/30 hover:text-parchment/60 transition-colors">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>

            <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                required
            />

            <AnimatePresence>
                {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs text-red-400 font-space">{error}</motion.p>
                )}
                {success && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs text-emerald-400 font-space">{success}</motion.p>
                )}
            </AnimatePresence>

            <button
                type="submit"
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-sm font-space hover:bg-[#D4AF37]/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
                <Lock size={14} />
                {saving ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    );
}

/* ─── Currency Select Dropdown ─── */
function CurrencySelect({ label, value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<any>(null);
    const currencies = Object.values(SUPPORTED_CURRENCIES);
    const selected = (SUPPORTED_CURRENCIES as any)[value];

    useEffect(() => {
        const handler = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <div className="text-[0.75rem] uppercase tracking-widest text-parchment/30 mb-1.5 font-space">{label}</div>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <span className="text-base">{selected?.flag}</span>
                    <span className="text-sm text-parchment font-space">{selected?.code}</span>
                    <span className="text-xs text-parchment/40 font-space hidden sm:inline">({selected?.name})</span>
                </span>
                <ChevronDown size={14} className={`text-parchment/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                        {currencies.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { onChange(c.code); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors
                                    ${c.code === value ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-parchment'}`}
                            >
                                <span className="text-base">{c.flag}</span>
                                <span className="text-sm font-space font-medium">{c.code}</span>
                                <span className="text-xs text-parchment/40 font-space">{c.name}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Background Select Dropdown ─── */
function BackgroundSelect({ label, value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<any>(null);
    
    const backgrounds = [
        { id: 'collection', name: 'Collection' },
        { id: 'concretely-funky', name: 'Concretely Funky' },
        { id: 'crystal-of-groove', name: 'Crystal of Groove' },
        { id: 'envelope-of-funk-light', name: 'Envelope of Funk Light' },
        { id: 'envelope-of-groove', name: 'Envelope of Groove' },
        { id: 'frosted-glass', name: 'Frosted Glass' },
        { id: 'funky-ledger', name: 'Funky Ledger' },
        { id: 'groove-vault', name: 'Groove Vault' },
        { id: 'linen-funk-light', name: 'Linen Funk Light' },
        { id: 'linen-funk', name: 'Linen Funk' },
        { id: 'lux-swing', name: 'Lux Swing' },
        { id: 'mosaic-dance', name: 'Mosaic Dance' },
        { id: 'neon-slap', name: 'Neon Slap' },
        { id: 'type-f', name: 'Type F' },
        { id: 'velvet-medal', name: 'Velvet Medal' },
        { id: 'vinyl-voyage', name: 'Vinyl Voyage' },
        { id: 'walnut-grooves', name: 'Walnut Grooves' },
    ];
    
    const selected = backgrounds.find(b => b.id === value) || backgrounds.find(b => b.id === 'vinyl-voyage');

    useEffect(() => {
        const handler = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative mt-4">
            <div className="text-[0.75rem] uppercase tracking-widest text-parchment/30 mb-1.5 font-space">{label}</div>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-colors"
            >
                <span className="text-sm text-parchment font-space">{selected?.name}</span>
                <ChevronDown size={14} className={`text-parchment/30 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                        <div className="max-h-60 overflow-y-auto">
                            {backgrounds.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => { onChange(b.id); setOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors
                                        ${b.id === selected?.id ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-parchment'}`}
                                >
                                    <span className="text-sm font-space font-medium">{b.name}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Delete Account Confirmation Modal ─── */
function DeleteAccountModal({ isOpen, onClose, onConfirm }: any) {
    const [input, setInput] = useState('');
    const [deleting, setDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="glass-card w-full max-w-md p-6 space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bebas text-xl tracking-widest m-0">Delete Account</h3>
                            <p className="text-parchment/50 text-xs font-space m-0">This action cannot be undone</p>
                        </div>
                    </div>

                    <div className="text-parchment/70 text-sm font-space leading-relaxed">
                        This will permanently delete your account and <strong className="text-parchment">all associated data</strong> including
                        assets, transactions, snapshots, and bank connections.
                    </div>

                    <div>
                        <label className="text-xs text-parchment/40 font-space block mb-1.5">
                            Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                        </label>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="DELETE"
                            className="w-full bg-white/5 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-parchment font-space outline-none focus:border-red-500/40 transition-colors"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={input !== 'DELETE' || deleting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-space hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <Trash2 size={14} />
                            {deleting ? 'Deleting...' : 'Delete Forever'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─── Main Profile Page ─── */
export default function ProfilePage() {
    const { data: session, update: updateSession } = useSession();
    const { appSettings, handleUpdateAppSettings, resetFtue } = usePortfolio();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resettingFtue, setResettingFtue] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async (name: string) => {
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated = await res.json();
        setProfile(updated);
        await updateSession({ name: updated.name });
    };

    const handleCurrencyChange = async (field: string, value: string) => {
        const body = field === 'primary'
            ? { primaryCurrency: value }
            : { secondaryCurrency: value };

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
            }
        } catch (err) {
            console.error('Failed to update currency:', err);
        }
    };

    const handleBackgroundChange = async (value: string) => {
        handleUpdateAppSettings({ ...appSettings, backgroundSelection: value });
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch('/api/user/export');
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('/api/user/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation: 'DELETE' }),
            });
            if (res.ok) {
                await signOut({ callbackUrl: '/login' });
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-48 bg-white/5 rounded-2xl" />
                    <div className="h-64 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    const user = profile || session?.user;
    if (!user) return null;

    const providerLabel = profile?.provider === 'google' ? 'Google' : 'Email & Password';
    const isCredentials = profile?.provider === 'credentials';
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;
    const currencyPrefs = profile?.currencyPreferences || { primary: 'BRL', secondary: 'GBP' };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* ═══ Page Header ═══ */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-2"
            >
                <User size={20} className="text-[#D4AF37]/60" />
                <h2 className="text-xs uppercase text-parchment/50 tracking-[0.2em] font-space font-medium m-0">
                    Profile & Settings
                </h2>
            </motion.div>

            {/* ═══ Two-Column Grid (Desktop) / Single-Column (Mobile) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* ─── Left Column: User Info ─── */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard title="Account" icon={User}>
                        <div className="flex flex-col items-center text-center gap-4 pb-2">
                            <ProfileAvatar
                                src={session?.user?.image || profile?.avatar_url}
                                name={user.name || user.email}
                            />

                            <div className="w-full space-y-3">
                                <EditableName
                                    value={user.name || 'Unnamed'}
                                    onSave={handleUpdateName}
                                />

                                <div className="flex items-center gap-2 text-parchment/50 text-sm">
                                    <Mail size={14} className="text-parchment/30" />
                                    <span className="font-space">{user.email}</span>
                                </div>

                                <div className="flex items-center gap-2 text-parchment/50 text-sm">
                                    <Shield size={14} className="text-parchment/30" />
                                    <span className="font-space">
                                        Signed in via <span className="text-[#D4AF37]/80">{providerLabel}</span>
                                    </span>
                                </div>

                                {memberSince && (
                                    <div className="flex items-center gap-2 text-parchment/50 text-sm">
                                        <Calendar size={14} className="text-parchment/30" />
                                        <span className="font-space">Member since {memberSince}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SectionCard>

                    {/* Password Change (credentials only) */}
                    {isCredentials && (
                        <SectionCard title="Change Password" icon={Lock}>
                            <PasswordChangeForm />
                        </SectionCard>
                    )}

                    {/* Sign Out */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-space hover:bg-red-500/20 active:scale-[0.98] transition-all"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </motion.button>
                </div>

                {/* ─── Right Column: Banks, Preferences, Data ─── */}
                <div className="lg:col-span-3 space-y-6">
                    <SectionCard title="Connected Banks" icon={Landmark}>
                        <div className="space-y-4">
                            <ConnectedInstitutionsList />
                            <div className="pt-2 border-t border-white/5">
                                <BankConnectButton />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Preferences — Currency Selector */}
                    <SectionCard title="Preferences" icon={Settings}>
                        <div className="space-y-4">
                            <CurrencySelect
                                label="Primary Currency"
                                value={currencyPrefs.primary}
                                onChange={(v: string) => handleCurrencyChange('primary', v)}
                            />
                            <CurrencySelect
                                label="Secondary Currency"
                                value={currencyPrefs.secondary}
                                onChange={(v: string) => handleCurrencyChange('secondary', v)}
                            />
                            <BackgroundSelect
                                label="App Background"
                                value={appSettings?.backgroundSelection || 'vinyl-voyage'}
                                onChange={handleBackgroundChange}
                            />

                            {/* Replay Tutorial */}
                            <div className="mt-5 pt-4 border-t border-white/5">
                                <div className="text-[0.75rem] uppercase tracking-widest text-parchment/30 mb-1.5 font-space">Tutorial</div>
                                <button
                                    onClick={async () => {
                                        setResettingFtue(true);
                                        try {
                                            await resetFtue();
                                            router.push('/dashboard');
                                        } catch (e) {
                                            console.error(e);
                                        } finally {
                                            setResettingFtue(false);
                                        }
                                    }}
                                    disabled={resettingFtue}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.03] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                                        <LayoutDashboard size={14} className="text-[#D4AF37]/70" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm text-parchment font-space font-medium">
                                            {resettingFtue ? 'Resetting...' : 'Replay Tutorial'}
                                        </div>
                                        <div className="text-[0.75rem] text-parchment/30 font-space">Restart the guided walkthrough from the beginning</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Data Management */}
                    <SectionCard title="Data Management" icon={Download}>
                        <div className="space-y-3">
                            <p className="text-sm text-parchment/50 font-space m-0">
                                Import data from spreadsheets or export your portfolio.
                            </p>
                            <Link
                                href="/import"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-sm font-space hover:bg-[#D4AF37]/20 active:scale-[0.98] transition-all no-underline"
                            >
                                <Upload size={16} />
                                Import Spreadsheet
                            </Link>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-parchment/60 text-sm font-space hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                            >
                                <Download size={16} />
                                {exporting ? 'Exporting...' : 'Export All Data'}
                            </button>
                        </div>
                    </SectionCard>

                    {/* Danger Zone */}
                    <SectionCard title="Danger Zone" icon={AlertTriangle} variant="danger">
                        <div className="space-y-3">
                            <p className="text-sm text-parchment/50 font-space m-0">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-space hover:bg-red-500/20 active:scale-[0.98] transition-all"
                            >
                                <Trash2 size={16} />
                                Delete Account
                            </button>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* Delete confirmation modal */}
            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
            />
        </div>
    );
}
