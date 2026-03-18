import React from 'react';

export default function AssetCardSkeleton() {
    return (
        <div className="rounded-2xl bg-[#121418]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300 ease-out mb-3 pointer-events-none" style={{ padding: '0' }}>
            <div className="p-4 pl-5 flex items-center justify-between min-h-[72px]">
                <div className="flex items-center gap-3 flex-1">
                    {/* Icon Skeleton */}
                    <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse shrink-0 border border-white/5" />

                    {/* Text Skeleton Left */}
                    <div className="flex flex-col gap-2 w-full max-w-[120px]">
                        <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
                    </div>
                </div>

                {/* Text Skeleton Right */}
                <div className="flex flex-col items-end gap-2 shrink-0 w-24">
                    <div className="h-5 bg-white/10 rounded w-full animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
