import Skeleton, { SkeletonCard } from '@/components/Skeleton';

export default function DashboardLoading() {
    return (
        <div className="pb-10">
            <div className="flex flex-col items-center pt-2 pb-8 px-4 mb-4">
                <Skeleton width="40%" height="0.75rem" className="mb-3" />
                <Skeleton width="60%" height="3rem" className="mb-2" />
                <Skeleton width="30%" height="1rem" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Skeleton height="250px" rounded="rounded-2xl" />
                <Skeleton height="250px" rounded="rounded-2xl" />
            </div>
        </div>
    );
}
