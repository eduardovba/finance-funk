'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

// ─── Quick-pick favourites (shown by default) ────────────────
const QUICK_EMOJIS = [
    '🍔', '🛒', '🏠', '🚗', '💡', '📱',
    '🎮', '✈️', '🏥', '📚', '🎵', '💪',
    '☕', '🍕', '🎬', '👕', '💼', '🐾',
    '🎁', '💰', '📊', '🏦', '💳', '🔧',
];

// ─── Searchable emoji database ───────────────────────────────
const EMOJI_DATABASE: { emoji: string; keywords: string }[] = [
    // Food & Drink
    { emoji: '🍔', keywords: 'burger hamburger fast food dining' },
    { emoji: '🍕', keywords: 'pizza food dining' },
    { emoji: '🍣', keywords: 'sushi japanese food dining' },
    { emoji: '🍜', keywords: 'noodles ramen soup food' },
    { emoji: '🍝', keywords: 'pasta spaghetti italian food' },
    { emoji: '🍞', keywords: 'bread bakery food' },
    { emoji: '🥗', keywords: 'salad healthy food' },
    { emoji: '🍟', keywords: 'fries chips fast food' },
    { emoji: '🌮', keywords: 'taco mexican food' },
    { emoji: '🧁', keywords: 'cupcake dessert sweet cake' },
    { emoji: '🍰', keywords: 'cake dessert birthday sweet' },
    { emoji: '🍩', keywords: 'donut doughnut dessert sweet' },
    { emoji: '🍺', keywords: 'beer alcohol drink pub bar' },
    { emoji: '🍷', keywords: 'wine alcohol drink dinner' },
    { emoji: '🍸', keywords: 'cocktail martini drink bar' },
    { emoji: '☕', keywords: 'coffee cafe latte espresso drink' },
    { emoji: '🧃', keywords: 'juice box drink beverage' },
    { emoji: '🥤', keywords: 'drink soda smoothie beverage' },
    { emoji: '🛒', keywords: 'shopping cart groceries supermarket' },
    { emoji: '🧊', keywords: 'ice frozen cold' },

    // Transport
    { emoji: '🚗', keywords: 'car auto vehicle drive transport' },
    { emoji: '🚕', keywords: 'taxi cab ride transport uber' },
    { emoji: '🚆', keywords: 'train railway transport commute' },
    { emoji: '🚌', keywords: 'bus public transport commute' },
    { emoji: '✈️', keywords: 'plane airplane flight travel transport' },
    { emoji: '⛽', keywords: 'fuel gas petrol station transport' },
    { emoji: '🚲', keywords: 'bicycle bike cycle transport' },
    { emoji: '🛴', keywords: 'scooter electric transport' },
    { emoji: '🚇', keywords: 'metro underground subway tube transport' },
    { emoji: '🛳️', keywords: 'ship cruise boat ferry transport' },
    { emoji: '🏍️', keywords: 'motorcycle motorbike transport' },

    // Home & Living
    { emoji: '🏠', keywords: 'house home housing rent mortgage' },
    { emoji: '🏢', keywords: 'building office work' },
    { emoji: '🛏️', keywords: 'bed bedroom sleep furniture' },
    { emoji: '🛁', keywords: 'bath bathroom' },
    { emoji: '🧹', keywords: 'broom cleaning' },
    { emoji: '🧺', keywords: 'laundry basket cleaning' },
    { emoji: '🔑', keywords: 'key house rent' },
    { emoji: '🪴', keywords: 'plant garden houseplant' },
    { emoji: '🪑', keywords: 'chair furniture seat' },
    { emoji: '🛋️', keywords: 'couch sofa furniture' },

    // Utilities & Bills
    { emoji: '💡', keywords: 'light bulb electricity energy utility' },
    { emoji: '⚡', keywords: 'electricity energy power bolt utility' },
    { emoji: '🔥', keywords: 'fire gas heating utility' },
    { emoji: '💧', keywords: 'water droplet utility bill' },
    { emoji: '📱', keywords: 'phone mobile smartphone bill' },
    { emoji: '📞', keywords: 'telephone phone call bill' },
    { emoji: '📶', keywords: 'wifi internet signal network' },
    { emoji: '📡', keywords: 'satellite internet tv' },

    // Shopping
    { emoji: '🛍️', keywords: 'shopping bags retail store' },
    { emoji: '👕', keywords: 'shirt tshirt clothes clothing' },
    { emoji: '👗', keywords: 'dress clothes clothing fashion' },
    { emoji: '👟', keywords: 'shoes sneakers trainers footwear' },
    { emoji: '👜', keywords: 'handbag purse bag fashion' },
    { emoji: '💍', keywords: 'ring jewellery jewelry' },
    { emoji: '🕶️', keywords: 'sunglasses glasses fashion' },
    { emoji: '🧢', keywords: 'cap hat fashion' },
    { emoji: '🎒', keywords: 'backpack bag school' },

    // Health & Fitness
    { emoji: '🏥', keywords: 'hospital health medical doctor' },
    { emoji: '💊', keywords: 'pill medicine pharmacy health' },
    { emoji: '💪', keywords: 'muscle gym fitness exercise' },
    { emoji: '🏋️', keywords: 'weightlifting gym fitness exercise' },
    { emoji: '🧘', keywords: 'yoga meditation wellness' },
    { emoji: '🦷', keywords: 'tooth dentist dental health' },
    { emoji: '👓', keywords: 'glasses eyewear optician vision' },
    { emoji: '🩺', keywords: 'stethoscope doctor medical health' },
    { emoji: '💉', keywords: 'syringe vaccine injection health' },

    // Entertainment
    { emoji: '🎬', keywords: 'cinema film movie entertainment' },
    { emoji: '🎮', keywords: 'gaming video games controller' },
    { emoji: '🎵', keywords: 'music note song entertainment' },
    { emoji: '🎤', keywords: 'microphone karaoke singing music' },
    { emoji: '📺', keywords: 'television tv streaming subscription' },
    { emoji: '🎭', keywords: 'theatre theater arts entertainment' },
    { emoji: '🎪', keywords: 'circus tent event entertainment' },
    { emoji: '🎯', keywords: 'target darts game' },
    { emoji: '🎲', keywords: 'dice game board game' },
    { emoji: '🎳', keywords: 'bowling game sport' },
    { emoji: '🏆', keywords: 'trophy award prize' },

    // Finance
    { emoji: '💰', keywords: 'money bag income salary' },
    { emoji: '💳', keywords: 'credit card payment bank' },
    { emoji: '🏦', keywords: 'bank finance institution' },
    { emoji: '📊', keywords: 'chart stats analytics finance' },
    { emoji: '📈', keywords: 'graph growth stock investment' },
    { emoji: '🪙', keywords: 'coin money currency' },
    { emoji: '💵', keywords: 'dollar money cash currency' },
    { emoji: '💷', keywords: 'pound sterling gbp money' },
    { emoji: '💶', keywords: 'euro money currency' },
    { emoji: '🧾', keywords: 'receipt bill invoice' },
    { emoji: '💼', keywords: 'briefcase business work salary' },

    // Education
    { emoji: '📚', keywords: 'books education study reading' },
    { emoji: '🎓', keywords: 'graduation cap education university' },
    { emoji: '✏️', keywords: 'pencil writing school education' },
    { emoji: '📝', keywords: 'memo note writing' },
    { emoji: '🖥️', keywords: 'computer desktop screen tech' },
    { emoji: '💻', keywords: 'laptop computer tech work' },

    // Pets
    { emoji: '🐾', keywords: 'paw print pet animal' },
    { emoji: '🐕', keywords: 'dog pet animal' },
    { emoji: '🐈', keywords: 'cat pet animal' },
    { emoji: '🐠', keywords: 'fish pet aquarium' },

    // Kids & Family
    { emoji: '👶', keywords: 'baby infant child kids' },
    { emoji: '🎁', keywords: 'gift present birthday' },
    { emoji: '🧸', keywords: 'teddy bear toy kids' },
    { emoji: '🍼', keywords: 'baby bottle milk infant' },

    // Tools & Services
    { emoji: '🔧', keywords: 'wrench tool repair maintenance' },
    { emoji: '🔨', keywords: 'hammer tool construction' },
    { emoji: '🧰', keywords: 'toolbox repair maintenance' },
    { emoji: '🚿', keywords: 'shower plumber plumbing' },

    // Nature & Sports
    { emoji: '⚽', keywords: 'football soccer sport' },
    { emoji: '🎾', keywords: 'tennis sport ball' },
    { emoji: '🏀', keywords: 'basketball sport ball' },
    { emoji: '🏊', keywords: 'swimming pool sport' },
    { emoji: '⛷️', keywords: 'skiing ski snow sport' },
    { emoji: '🏕️', keywords: 'camping tent outdoors nature' },
    { emoji: '🌍', keywords: 'globe earth world travel' },
    { emoji: '🏖️', keywords: 'beach holiday vacation travel' },

    // Miscellaneous
    { emoji: '💐', keywords: 'flowers bouquet gift' },
    { emoji: '🎂', keywords: 'birthday cake celebration' },
    { emoji: '💒', keywords: 'wedding church ceremony' },
    { emoji: '🙏', keywords: 'prayer charity donation giving' },
    { emoji: '❤️', keywords: 'heart love charity donate' },
    { emoji: '🏷️', keywords: 'tag label price sale' },
    { emoji: '📦', keywords: 'package box delivery parcel' },
    { emoji: '🗑️', keywords: 'trash waste bin rubbish' },
    { emoji: '🔒', keywords: 'lock security insurance' },
    { emoji: '⏰', keywords: 'alarm clock time' },
    { emoji: '📅', keywords: 'calendar date schedule' },
    { emoji: '✨', keywords: 'sparkles stars special' },
];

interface EmojiPickerProps {
    selected: string | null;
    onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
    const [search, setSearch] = useState('');

    const filteredEmojis = useMemo(() => {
        if (!search.trim()) return null; // show quick-pick grid
        const q = search.toLowerCase();
        return EMOJI_DATABASE.filter(e =>
            e.keywords.includes(q) || e.emoji === search
        );
    }, [search]);

    const showingResults = filteredEmojis !== null;
    const displayEmojis = showingResults
        ? filteredEmojis.map(e => e.emoji)
        : QUICK_EMOJIS;

    return (
        <div className="flex flex-col gap-2">
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-[#D4AF37]/30 transition-colors">
                <Search size={14} className="text-[#F5F5DC]/25 flex-shrink-0" />
                <input
                    type="text"
                    placeholder="Search emojis… (e.g. food, car, gym)"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-space text-[#F5F5DC]/70 placeholder:text-[#F5F5DC]/15 focus:outline-none"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="text-2xs text-[#F5F5DC]/25 hover:text-[#F5F5DC]/50 font-space transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-6 gap-2">
                {displayEmojis.map(emoji => (
                    <motion.button
                        key={emoji}
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onSelect(emoji)}
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg transition-all
                            ${selected === emoji
                                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                                : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06]'
                            }`}
                    >
                        {emoji}
                    </motion.button>
                ))}
            </div>

            {/* No results */}
            {showingResults && displayEmojis.length === 0 && (
                <p className="text-xs text-[#F5F5DC]/20 font-space text-center py-2">
                    No emojis found for &quot;{search}&quot;
                </p>
            )}

            {/* Result count hint */}
            {showingResults && displayEmojis.length > 0 && (
                <p className="text-2xs text-[#F5F5DC]/15 font-space text-center">
                    {displayEmojis.length} result{displayEmojis.length !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
}
