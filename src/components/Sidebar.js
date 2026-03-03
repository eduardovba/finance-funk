import { LayoutDashboard, BookOpen, TrendingUp, Eye, Landmark, Home, LineChart, Bitcoin, Wallet, CreditCard } from 'lucide-react';

const iconMap = {
    'dashboard': LayoutDashboard,
    'general-ledger': BookOpen,
    'forecast': TrendingUp,
    'live-tracking': Eye,
    'fixed-income': Landmark,
    'real-estate': Home,
    'equity': LineChart,
    'crypto': Bitcoin,
    'pensions': Wallet,
    'debt': CreditCard,
};

export default function Sidebar({ activeItem, onNavigate }) {
    const trackingItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'general-ledger', label: 'General Ledger' },
        { id: 'forecast', label: 'Targets' },
        { id: 'long-term-forecast', label: 'Long-Term Forecast' },
        { id: 'live-tracking', label: 'Watchlist' },
    ];

    const assetItems = [
        { id: 'fixed-income', label: 'Fixed Income' },
        { id: 'real-estate', label: 'Real Estate' },
        { id: 'equity', label: 'Equity' },
        { id: 'crypto', label: 'Crypto' },
        { id: 'pensions', label: 'Pensions' },
        { id: 'debt', label: 'Debt' },
    ];

    const renderGroup = (title, items) => (
        <div className="mb-6">
            <h3 className="text-xs uppercase text-parchment/50 mb-3 pl-4 tracking-widest font-medium">
                {title}
            </h3>
            <ul className="list-none p-0 m-0">
                {items.map(item => {
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

    return (
        <aside className="glass-card h-[calc(100vh-64px)] w-[260px] sticky top-8 p-6 flex-shrink-0 overflow-y-auto flex flex-col border-r border-[#D4AF37]/20">
            {/* Logo */}
            <div className="mb-10 px-2 flex items-center gap-3">
                <img src="/ff-logo.png" alt="Finance Funk" className="h-[60px] w-auto" />
                <h2 className="text-[#D4AF37] text-2xl m-0 font-normal tracking-wider font-bebas drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">Finance Funk</h2>
            </div>

            <nav className="flex-1">
                {renderGroup('Tracking', trackingItems)}
                {renderGroup('Assets', assetItems)}
            </nav>

            {/* Profile Section */}
            <div className="mt-auto pt-4 border-t border-record/10 flex items-center gap-3 px-2">
                <img
                    src="/pocket-puma.png"
                    alt="DJ Moneybags"
                    className="w-10 h-10 rounded-full object-cover border-2 border-record/30"
                />
                <div>
                    <p className="text-record text-sm font-bold tracking-wide m-0">DJ_MONEYBAGS</p>
                    <p className="text-parchment/40 text-xs m-0">Portfolio Manager</p>
                </div>
            </div>
        </aside>
    );
}
