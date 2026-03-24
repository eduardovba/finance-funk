import Skeleton from '@/components/Skeleton';

export default function BudgetLoading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-center">
                <Skeleton width="200px" height="2rem" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height="80px" rounded="rounded-2xl" />
                ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Skeleton height="200px" rounded="rounded-2xl" />
                <Skeleton height="200px" rounded="rounded-2xl" />
            </div>
        </div>
    );
}
