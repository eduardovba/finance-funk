import React from 'react';

export default function EmptyState({ icon, title, message, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 border border-white/5 rounded-3xl mt-8 mb-12 shadow-xl backdrop-blur-sm">
            <div className="text-6xl mb-6 drop-shadow-lg" style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.5))' }}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">{title}</h3>
            <p className="text-white/50 mb-8 max-w-sm mx-auto leading-relaxed text-sm">
                {message}
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="bg-[#D4AF37] hover:bg-[#c59b27] text-black font-semibold py-3.5 px-8 rounded-full transition-all duration-300 shadow-[0_4px_14px_rgba(212,175,55,0.25)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] hover:-translate-y-0.5"
                    >
                        {actionLabel}
                    </button>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <button
                        onClick={onSecondaryAction}
                        className="bg-white/10 hover:bg-white/15 text-white/80 font-semibold py-3.5 px-8 rounded-full transition-all duration-300 border border-white/10 hover:border-white/20 hover:-translate-y-0.5"
                    >
                        {secondaryActionLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
