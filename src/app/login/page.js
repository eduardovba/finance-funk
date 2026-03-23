"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import "./login.css";

/* ─── Transition config ─── */
const viewTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.3, ease: "easeInOut" },
};

/* ─── Bar chart data ─── */
const BAR_HEIGHTS = [40, 65, 50, 80, 55, 35, 70, 45, 60, 75, 42, 58];
const ACCENT_BARS = new Set([3, 9]);

/* ─── Trust signal SVG icons ─── */
function ShieldIcon() {
    return (
        <svg className="welcome-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function BoltIcon() {
    return (
        <svg className="welcome-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function GlobeIcon() {
    return (
        <svg className="welcome-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />
        </svg>
    );
}

/* ─── Google SVG icon ─── */
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

/* ═══════════════════════════════════════════
   Welcome View
   ═══════════════════════════════════════════ */
function WelcomeView({ onLogin, callbackUrl }) {
    const router = useRouter();

    return (
        <motion.div key="welcome" {...viewTransition}>
            <div className="login-card">
                {/* Logo */}
                <div className="welcome-logo">
                    <img src="/logos/ff-logo.png" alt="Finance Funk" className="welcome-logo-img" />
                </div>

                {/* Value Proposition */}
                <div className="welcome-value">
                    <h1 className="welcome-heading">Your Money, Your Rhythm</h1>
                    <p className="welcome-subtitle">
                        Track spending across currencies, manage budgets, and watch your investments grow.
                    </p>
                </div>

                {/* Feature Pills */}
                <div className="welcome-pills">
                    <span className="welcome-pill">
                        <span className="welcome-pill-icon">◈</span>
                        Multi-currency
                    </span>
                    <span className="welcome-pill">
                        <span className="welcome-pill-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                        </span>
                        Investment tracking
                    </span>
                    <span className="welcome-pill">
                        <span className="welcome-pill-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        </span>
                        Smart budgets
                    </span>
                </div>

                {/* Dashboard Preview Panel */}
                <div className="welcome-preview">
                    <div className="preview-label">Preview Your Dashboard</div>

                    {/* Metric cards */}
                    <div className="preview-metrics">
                        <div className="preview-metric">
                            <div className="preview-metric-label">Monthly Spending</div>
                            <div className="preview-metric-value">R$ 4,230</div>
                            <div className="preview-metric-change">-12% vs last month</div>
                        </div>
                        <div className="preview-metric">
                            <div className="preview-metric-label">
                                Portfolio
                                <span className="preview-metric-badge">GBP</span>
                            </div>
                            <div className="preview-metric-value">£52,870</div>
                            <div className="preview-metric-change">+3.2% this month</div>
                        </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="preview-bars">
                        {BAR_HEIGHTS.map((h, i) => (
                            <div
                                key={i}
                                className={`preview-bar${ACCENT_BARS.has(i) ? " preview-bar--accent" : ""}`}
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>

                    {/* Category pills */}
                    <div className="preview-categories">
                        <span className="preview-cat preview-cat--green">Moradia R$ 2,100</span>
                        <span className="preview-cat preview-cat--gold">Alimentação R$ 980</span>
                        <span className="preview-cat preview-cat--orange">Transporte R$ 420</span>
                        <span className="preview-cat preview-cat--purple">Lazer R$ 380</span>
                    </div>
                </div>

                {/* CTAs */}
                <div className="welcome-ctas">
                    <button
                        type="button"
                        className="login-google-btn"
                        onClick={() => signIn("google", { callbackUrl })}
                    >
                        <GoogleIcon />
                        Sign up with Google
                    </button>

                    <div className="login-divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="welcome-cta-primary"
                        onClick={() => router.push("/onboarding")}
                    >
                        Get Started
                    </button>
                    <button
                        type="button"
                        className="welcome-cta-secondary"
                        onClick={onLogin}
                    >
                        I already have an account
                    </button>
                </div>

                {/* Trust Signals */}
                <div className="welcome-trust">
                    <span className="welcome-trust-item">
                        <ShieldIcon /> Bank-level encryption
                    </span>
                    <span className="welcome-trust-item">
                        <BoltIcon /> Free to use
                    </span>
                    <span className="welcome-trust-item">
                        <GlobeIcon /> Open finance
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   Login View
   ═══════════════════════════════════════════ */
function LoginView({ onBack, callbackUrl }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [errorMsg, setErrorMsg] = useState(
        error === "CredentialsSignin" ? "Invalid email or password." : ""
    );

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        const result = await signIn("credentials", {
            email,
            password,
            callbackUrl,
            redirect: true,
        });

        // If signIn doesn't redirect (error), we handle it
        if (result?.error) {
            setErrorMsg("Invalid email or password.");
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl });
    };

    return (
        <motion.div key="login" {...viewTransition}>
            <div className="login-card login-card--login">
                {/* Back button */}
                <button type="button" className="login-back-btn" onClick={onBack}>
                    <span className="login-back-arrow">←</span> Back
                </button>

                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <img src="/logos/ff-logo.png" alt="Finance Funk" className="login-logo-img" />
                    </div>
                    <h1 className="login-title">Welcome Back</h1>
                    <p className="login-subtitle">Sign in to your account</p>
                </div>

                {/* Error Message */}
                {errorMsg && (
                    <div className="login-error">
                        <span>⚠</span> {errorMsg}
                    </div>
                )}

                {/* Google OAuth */}
                <button type="button" onClick={handleGoogleLogin} className="login-google-btn">
                    <GoogleIcon />
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="login-divider">
                    <span>or sign in with email</span>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleCredentialsLogin} className="login-form">
                    <div className="login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="login-spinner" />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <p className="login-register-link">
                    Don&apos;t have an account?{" "}
                    <a href="/onboarding">Create one</a>
                </p>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   Page Shell
   ═══════════════════════════════════════════ */
function LoginPageContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const [view, setView] = useState("welcome");

    return (
        <div className="login-container">
            <div className="login-backdrop" />

            <AnimatePresence mode="wait">
                {view === "welcome" ? (
                    <WelcomeView
                        key="welcome"
                        onLogin={() => setView("login")}
                        callbackUrl={callbackUrl}
                    />
                ) : (
                    <LoginView
                        key="login"
                        onBack={() => setView("welcome")}
                        callbackUrl={callbackUrl}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="login-container"><div className="login-card" /></div>}>
            <LoginPageContent />
        </Suspense>
    );
}
