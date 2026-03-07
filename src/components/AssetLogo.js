"use client";

import React, { useState, useEffect, useRef } from 'react';

// ── Persistent client-side cache using localStorage ──
// Logos are cached in localStorage so they survive page refreshes.
// An in-memory map is also kept as a hot layer to avoid JSON parsing on every render.

const CACHE_KEY = 'asset_logo_cache';
const CACHE_VERSION_KEY = 'asset_logo_cache_v';
const CACHE_VERSION = 2; // Bump to invalidate all cached entries
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Hot in-memory cache (populated from localStorage on first access)
let memoryCache = null;

function getCache() {
    if (memoryCache) return memoryCache;
    try {
        // Version check — wipe cache if outdated
        const storedVersion = parseInt(localStorage.getItem(CACHE_VERSION_KEY) || '0', 10);
        if (storedVersion < CACHE_VERSION) {
            localStorage.removeItem(CACHE_KEY);
            localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION));
            memoryCache = {};
            return memoryCache;
        }

        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            memoryCache = JSON.parse(raw);
            // Prune stale entries
            const now = Date.now();
            let pruned = false;
            for (const key of Object.keys(memoryCache)) {
                if (now - (memoryCache[key].ts || 0) > CACHE_TTL_MS) {
                    delete memoryCache[key];
                    pruned = true;
                }
            }
            if (pruned) saveCache();
        } else {
            memoryCache = {};
        }
    } catch {
        memoryCache = {};
    }
    return memoryCache;
}

function saveCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch { /* storage full or unavailable — non-critical */ }
}

function getCachedLogo(ticker) {
    const cache = getCache();
    const entry = cache[ticker];
    if (!entry) return undefined; // not cached
    if (Date.now() - (entry.ts || 0) > CACHE_TTL_MS) {
        delete cache[ticker];
        saveCache();
        return undefined;
    }
    return entry; // { url: string|null, ts: number }
}

function setCachedLogo(ticker, url) {
    if (!url) return; // Don't cache failures — retry on next load
    const cache = getCache();
    cache[ticker] = { url, ts: Date.now() };
    saveCache();
}

// ── Dedup in-flight requests ──
const inflight = {};

function hashColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 50%, 40%)`;
}

export default function AssetLogo({ ticker, name, size = 36, className = '' }) {
    const [logoUrl, setLogoUrl] = useState(() => {
        // Instantly resolve from cache if available (no flash)
        if (!ticker) return null;
        const cached = getCachedLogo(ticker);
        return cached?.url || null;
    });
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const mountedRef = useRef(true);

    const initial = (name || ticker || '?').charAt(0).toUpperCase();
    const bgColor = hashColor(ticker || name || '?');

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!ticker) return;

        // Check persistent cache
        const cached = getCachedLogo(ticker);
        if (cached !== undefined) {
            if (cached.url) {
                setLogoUrl(cached.url);
                setImgError(false);
            }
            return; // cached — no API call needed
        }

        // Dedup: if another instance is already fetching this ticker, piggyback
        if (inflight[ticker]) {
            inflight[ticker].then(url => {
                if (mountedRef.current) {
                    setLogoUrl(url);
                    setImgError(false);
                }
            });
            return;
        }

        const fetchLogo = async () => {
            try {
                const res = await fetch(`/api/asset-logos?ticker=${encodeURIComponent(ticker)}&name=${encodeURIComponent(name || '')}`);
                const data = await res.json();

                const url = data.logo_url || null;
                setCachedLogo(ticker, url);

                if (mountedRef.current) {
                    setLogoUrl(url);
                    setImgError(false);
                }
                return url;
            } catch {
                setCachedLogo(ticker, null);
                return null;
            }
        };

        const promise = fetchLogo();
        inflight[ticker] = promise;
        promise.finally(() => { delete inflight[ticker]; });
    }, [ticker]);

    const circleStyle = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        color: '#fff',
        backgroundColor: bgColor,
        flexShrink: 0,
        position: 'relative',
    };

    const showImage = logoUrl && !imgError;

    return (
        <div style={circleStyle} className={className}>
            {/* Always render the fallback initial — visible while image loads or if no image */}
            <span style={{
                letterSpacing: '0.5px',
                userSelect: 'none',
                opacity: showImage && imgLoaded ? 0 : 1,
                transition: 'opacity 0.25s ease',
                position: 'absolute',
            }}>
                {initial}
            </span>

            {/* Image layer — fades in on load */}
            {showImage && (
                <img
                    src={logoUrl}
                    alt={name || ticker}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: imgLoaded ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                        setImgError(true);
                        setImgLoaded(false);
                    }}
                />
            )}
        </div>
    );
}
