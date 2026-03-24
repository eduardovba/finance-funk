import Skeleton, { SkeletonCard } from '@/components/Skeleton';

export default function AssetLoading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-2 py-4">
                <Skeleton width="30%" height="0.75rem" />
                <Skeleton width="50%" height="2.5rem" />
                <Skeleton width="25%" height="0.875rem" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    <Skeleton width="40%" height="1.25rem" />
                    <SkeletonCard />
                </div>
            ))}
        </div>
    );
}
