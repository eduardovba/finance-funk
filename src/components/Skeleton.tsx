"use client";

import React from 'react';
import { Card } from '@/components/ui/card';

export default function Skeleton({ width = '100%', height = '1rem', className = '', rounded = 'rounded-lg' }: any) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] from-white/[0.03] ${rounded} ${className}`}
            style={{ width, height }}
        />
    );
}

export function SkeletonCard({ className = '' }: any) {
    return (
        <div className={`p-4 md:p-6 flex flex-col gap-3 ${className}`}>
            <Skeleton width="60%" height="0.75rem" />
            <Skeleton width="80%" height="2rem" />
            <Skeleton width="50%" height="0.75rem" />
            <div className="border-t border-white/5 pt-3 mt-1">
                <div className="flex justify-between">
                    <Skeleton width="40%" height="0.625rem" />
                    <Skeleton width="30%" height="0.625rem" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonChart({ className = '' }: any) {
    return (
        <div className={`bg-[#1A0F2E] border border-[#D4AF37]/30 rounded-xl p-6 shadow-lg ${className}`}>
            <Skeleton width="40%" height="1.25rem" className="mb-5" />
            <Skeleton width="100%" height="220px" rounded="rounded-xl" />
        </div>
    );
}
