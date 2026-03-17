"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "ff_installPromptDismissed";

/**
 * InstallPrompt — shows a dismissable banner inviting users to install Finance Funk
 * as a PWA. Only appears on mobile when the browser fires `beforeinstallprompt`.
 */
export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Don't show if already dismissed
        if (typeof window === "undefined") return;
        if (localStorage.getItem(DISMISSED_KEY) === "true") return;

        // Already running as installed PWA — no prompt needed
        if (window.matchMedia("(display-mode: standalone)").matches) return;

        const handler = (e) => {
            // Prevent Chrome's default mini-infobar
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setVisible(false);
        }
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, "true");
    }, []);

    if (!visible) return null;

    return (
        <div style={styles.backdrop}>
            <div style={styles.banner}>
                <img
                    src="/logos/FF Star.png"
                    alt="Finance Funk"
                    style={styles.icon}
                />
                <div style={styles.text}>
                    <strong style={styles.title}>Install Finance Funk</strong>
                    <span style={styles.subtitle}>
                        Add to your home screen for a native app experience
                    </span>
                </div>
                <div style={styles.actions}>
                    <button onClick={handleInstall} style={styles.installBtn}>
                        Install
                    </button>
                    <button onClick={handleDismiss} style={styles.dismissBtn}>
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", // Above BottomNav
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 1rem",
        zIndex: 9999,
        pointerEvents: "none",
    },
    banner: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: "rgba(30, 20, 50, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(156, 89, 182, 0.3)",
        borderRadius: "16px",
        padding: "0.75rem 1rem",
        maxWidth: "480px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        pointerEvents: "auto",
    },
    icon: {
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        flexShrink: 0,
    },
    text: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
    },
    title: {
        fontSize: "0.85rem",
        color: "#F5F0E8",
        letterSpacing: "0.01em",
    },
    subtitle: {
        fontSize: "0.72rem",
        color: "rgba(245, 240, 232, 0.55)",
        lineHeight: 1.3,
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexShrink: 0,
    },
    installBtn: {
        padding: "0.45rem 1rem",
        background: "linear-gradient(135deg, #6C3FC5, #9B59B6)",
        color: "#F5F0E8",
        border: "none",
        borderRadius: "10px",
        fontFamily: "inherit",
        fontSize: "0.78rem",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    dismissBtn: {
        background: "none",
        border: "none",
        color: "rgba(245, 240, 232, 0.4)",
        fontSize: "1rem",
        cursor: "pointer",
        padding: "4px",
        lineHeight: 1,
    },
};
