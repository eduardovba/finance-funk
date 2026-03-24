"use client";

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, BookOpen, TrendingUp, Landmark, Home, LineChart, Bitcoin, Wallet, CreditCard, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    href?: string;
}

interface SidebarProps {
    activeItem: string;
    onNavigate: (id: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
    'dashboard': LayoutDashboard,
    'general-ledger': BookOpen,
    'forecast': TrendingUp,
    'fixed-income': Landmark,
    'real-estate': Home,
    'equity': LineChart,
    'crypto': Bitcoin,
    'pensions': Wallet,
    'debt': CreditCard,
};

export default function Sidebar({ activeItem, onNavigate }: SidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const isProfileActive = pathname === '/profile';

    const trackingItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'general-ledger', label: 'General Ledger', href: '/ledger/income' },
        { id: 'forecast', label: 'Targets' },
        { id: 'long-term-forecast', label: 'Long-Term Forecast' },
    ];

    const assetItems: NavItem[] = [
        { id: 'fixed-income', label: 'Fixed Income' },
        { id: 'real-estate', label: 'Real Estate' },
        { id: 'equity', label: 'Equity' },
        { id: 'crypto', label: 'Crypto' },
        { id: 'pensions', label: 'Pensions' },
        { id: 'debt', label: 'Debt' },
    ];

    const renderGroup = (title: string, items: NavItem[]) => (
        <div className="mb-6">
            <h3 className="text-xs uppercase text-parchment/50 mb-3 pl-4 tracking-widest font-medium">
                {title}
            </h3>
            <ul className="list-none p-0 m-0">
                {items.map((item: NavItem) => {
                    const Icon = iconMap[item.id] || LayoutDashboard;
                    const isActive = activeItem === item.id;
                    return (
                        <li key={item.id} className="mb-1">
                            <button
                                onClick={() => onNavigate(item.id)}
                                className={`
                                    w-full text-left flex items-center gap-3 px-4 py-3 text-base rounded-lg border-none cursor-pointer
                                    transition-all duration-300
                                    ${isActive
                                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-r-4 border-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] font-bold'
                                        : 'bg-transparent text-[#F5F5DC]/60 hover:text-[#F5F5DC] hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                                {item.label}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    // Avatar: session image → fallback to initials
    const userName = session?.user?.name || 'User';
    const userImage = session?.user?.image;
    const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="h-[calc(100vh-64px)] w-[260px] sticky top-8 p-6 flex-shrink-0 overflow-y-auto flex flex-col border-r border-[#D4AF37]/20">
            {/* Logo */}
            <div className="mb-10 px-2 flex items-center gap-3">
                <Image src="/logos/ff-logo.png" alt="Finance Funk" height={60} width={120} className="h-[60px] w-auto" />
                <h2 className="text-[#D4AF37] text-2xl m-0 font-normal tracking-wider font-bebas drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">Finance Funk</h2>
            </div>

            <nav className="flex-1">
                {renderGroup('Tracking', trackingItems)}
                {renderGroup('Assets', assetItems)}
            </nav>

            {/* Profile Section — Clickable link to /profile */}
            <Link
                href="/profile"
                className={`mt-auto pt-4 border-t border-record/10 flex items-center gap-3 px-2 no-underline rounded-lg transition-all duration-200 group cursor-pointer hover:bg-white/5 ${isProfileActive ? 'bg-[#D4AF37]/10' : ''}`}
            >
                {userImage ? (
                    <Image
                        src={userImage}
                        alt={userName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border-2 border-record/30 flex-shrink-0"
                        unoptimized
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border-2 border-record/30 flex items-center justify-center text-[#D4AF37] text-sm font-bold flex-shrink-0">
                        {initials}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-record text-sm font-bold tracking-wide m-0 truncate">{userName}</p>
                    <p className="text-parchment/40 text-xs m-0">Portfolio Manager</p>
                </div>
                <ChevronRight size={14} className="text-parchment/20 group-hover:text-[#D4AF37]/60 transition-colors flex-shrink-0" />
            </Link>
        </aside>
    );
}
