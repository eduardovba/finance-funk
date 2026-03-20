import BudgetTabs from '@/components/budget/BudgetTabs';

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="max-w-5xl mx-auto px-4 pt-4">
            <BudgetTabs />
            {children}
        </div>
    );
}
