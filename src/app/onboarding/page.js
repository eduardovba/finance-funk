"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { CURRENCY_LIST, SUPPORTED_CURRENCIES } from "@/lib/currency";
import ProfessorF from "@/components/ftue/ProfessorF";
import { SpendingBarPreview, NetWorthAreaPreview, AllocationDonutPreview, CategoryBarsPreview } from "@/components/ftue/PreviewCharts";
import "./onboarding.css";

/* ─── Helpers ─── */
function detectCurrencyFromLocale() {
    const lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
    const localeMap = {
        "pt-BR": "BRL", pt: "BRL",
        "en-GB": "GBP",
        "en-US": "USD", en: "USD",
        de: "EUR", fr: "EUR", es: "EUR", it: "EUR",
        ja: "JPY",
        "de-CH": "CHF",
        "en-AU": "AUD",
    };
    return localeMap[lang] || localeMap[lang.split("-")[0]] || "USD";
}

const CURRENCY_SYMBOLS = { BRL: "R$", GBP: "£", USD: "$", EUR: "€", AUD: "A$", JPY: "¥", CHF: "CHF" };

/* ─── Transition config ─── */
const stepTransition = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.3, ease: "easeInOut" },
};

/* ─── SVG Icons ─── */
function WalletIcon({ color }) {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    );
}

function ChartIcon({ color }) {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

function GuitarIcon({ color }) {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 4v5" />
            <path d="M20 4h-5" />
            <path d="M14 10l-3.5 3.5" />
            <circle cx="8.5" cy="15.5" r="5" />
            <circle cx="8.5" cy="15.5" r="1.5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

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
   Animated Counter
   ═══════════════════════════════════════════ */
function AnimatedCount({ value, prefix = "", duration = 1.2 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        let start = 0;
        const end = value;
        const startTime = performance.now();
        const ms = duration * 1000;

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / ms, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(start + (end - start) * eased));
            if (progress < 1) ref.current = requestAnimationFrame(tick);
        }
        ref.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(ref.current);
    }, [value, duration]);

    return <>{prefix}{count.toLocaleString()}</>;
}

/* ═══════════════════════════════════════════
   STEP 1: What's Your Vibe?
   ═══════════════════════════════════════════ */
function StepGoal({ selectedGoal, setSelectedGoal, onContinue, onSkip }) {
    const firstCardRef = useRef(null);

    useEffect(() => {
        firstCardRef.current?.focus();
    }, []);

    const GOAL_MESSAGES = {
        budget: "Smart money management starts here! 💰",
        investments: "Let's make your portfolio groove! 📈",
        both: "Going all in! I like your style! 🎸",
    };

    const handleKeyDown = (e, goal) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedGoal(goal);
        }
    };

    return (
        <motion.div key="step-1" {...stepTransition}>
            <ProfessorF
                pose="welcome"
                message={GOAL_MESSAGES[selectedGoal] || "Welcome to Finance Funk! What are you looking to do?"}
                animate
            />

            <h1 className="onboarding-heading" style={{ fontSize: "1.6rem", marginTop: 24 }}>
                What&apos;s Your Vibe?
            </h1>
            <p className="onboarding-subtitle">
                Choose your focus — you can always change this later.
            </p>

            <div className="goal-cards" role="radiogroup" aria-label="Select your financial goal">
                <div
                    ref={firstCardRef}
                    className={`goal-card ${selectedGoal === "budget" ? "selected" : ""}`}
                    onClick={() => setSelectedGoal("budget")}
                    onKeyDown={(e) => handleKeyDown(e, "budget")}
                    role="radio"
                    aria-checked={selectedGoal === "budget"}
                    tabIndex={0}
                >
                    <div className="goal-check"><CheckIcon /></div>
                    <div className="goal-icon"><WalletIcon color="#D4AF37" /></div>
                    <h3 className="goal-title">Budget Tracking</h3>
                    <p className="goal-desc">Track spending, manage categories, and hit your savings goals</p>
                </div>

                <div
                    className={`goal-card ${selectedGoal === "investments" ? "selected-orange" : ""}`}
                    onClick={() => setSelectedGoal("investments")}
                    onKeyDown={(e) => handleKeyDown(e, "investments")}
                    role="radio"
                    aria-checked={selectedGoal === "investments"}
                    tabIndex={0}
                >
                    <div className="goal-check"><CheckIcon /></div>
                    <div className="goal-icon"><ChartIcon color="#CC5500" /></div>
                    <h3 className="goal-title">Investment Tracking</h3>
                    <p className="goal-desc">Monitor your portfolio, track returns, and manage multi-currency assets</p>
                </div>

                <div
                    className={`goal-card full-width ${selectedGoal === "both" ? "selected-gradient" : ""}`}
                    onClick={() => setSelectedGoal("both")}
                    onKeyDown={(e) => handleKeyDown(e, "both")}
                    role="radio"
                    aria-checked={selectedGoal === "both"}
                    tabIndex={0}
                >
                    <div className="goal-check"><CheckIcon /></div>
                    <div className="goal-icon"><GuitarIcon color="#D4AF37" /></div>
                    <h3 className="goal-title">The Full Groove</h3>
                    <p className="goal-desc">Budget tracking AND investment management — the complete experience</p>
                </div>
            </div>

            <button type="button" className="btn-primary" disabled={!selectedGoal} onClick={onContinue}>
                Continue
            </button>
            <button type="button" className="link-skip" onClick={onSkip}>
                Skip for now
            </button>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   STEP 2: Tune Your Experience
   ═══════════════════════════════════════════ */
function StepSetup({
    primaryCurrency, setPrimaryCurrency,
    secondaryCurrency, setSecondaryCurrency,
    experienceLevel, setExperienceLevel,
    onContinue, onBack,
}) {
    const firstBtnRef = useRef(null);

    useEffect(() => {
        firstBtnRef.current?.focus();
    }, []);

    const EXP_MESSAGES = {
        beginner: "No worries, I'll guide you through everything! 🎸",
        intermediate: "Nice — you'll pick this up fast!",
        advanced: "A fellow finance nerd! I'll keep the training wheels off 😎",
    };

    const canContinue = primaryCurrency && experienceLevel;

    const handleExpKeyDown = (e, level) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExperienceLevel(level);
        }
    };

    return (
        <motion.div key="step-2" {...stepTransition}>
            <ProfessorF
                pose="thinking"
                message={EXP_MESSAGES[experienceLevel] || "Let's personalize your setup — this takes 10 seconds"}
                animate
            />

            <h1 className="onboarding-heading" style={{ fontSize: "1.5rem", marginTop: 24 }}>
                Tune Your Experience
            </h1>
            <p className="onboarding-subtitle">
                Set your currencies and comfort level.
            </p>

            {/* Primary Currency */}
            <div className="setup-section">
                <span className="setup-section-label">What&apos;s your main currency?</span>
                <div className="currency-row">
                    {CURRENCY_LIST.map((c, i) => (
                        <button
                            key={c.code}
                            ref={i === 0 ? firstBtnRef : undefined}
                            type="button"
                            className={`currency-btn ${primaryCurrency === c.code ? "active" : ""}`}
                            onClick={() => {
                                setPrimaryCurrency(c.code);
                                if (secondaryCurrency === c.code) setSecondaryCurrency(null);
                            }}
                        >
                            {c.flag} {c.code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Secondary Currency */}
            <div className="setup-section">
                <span className="setup-section-label">Do you use a second currency? (optional)</span>
                <div className="currency-row">
                    <button
                        type="button"
                        className={`currency-btn currency-btn--no-secondary ${secondaryCurrency === null ? "active" : ""}`}
                        onClick={() => setSecondaryCurrency(null)}
                    >
                        No, just one
                    </button>
                    {CURRENCY_LIST.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            className={`currency-btn ${secondaryCurrency === c.code ? "active" : ""} ${primaryCurrency === c.code ? "currency-btn--disabled" : ""}`}
                            onClick={() => primaryCurrency !== c.code && setSecondaryCurrency(c.code)}
                            disabled={primaryCurrency === c.code}
                        >
                            {c.flag} {c.code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Experience Level */}
            <div className="setup-section">
                <span className="setup-section-label">How familiar are you with personal finance?</span>
                <div className="experience-cards" role="radiogroup" aria-label="Select your experience level">
                    {[
                        { id: "beginner", emoji: "🌱", title: "Getting Started", sub: "New to tracking finances" },
                        { id: "intermediate", emoji: "📊", title: "Comfortable", sub: "I know my way around spreadsheets" },
                        { id: "advanced", emoji: "🔥", title: "Power User", sub: "I eat P&L statements for breakfast" },
                    ].map((exp) => (
                        <div
                            key={exp.id}
                            className={`experience-card ${experienceLevel === exp.id ? "selected" : ""}`}
                            onClick={() => setExperienceLevel(exp.id)}
                            onKeyDown={(e) => handleExpKeyDown(e, exp.id)}
                            role="radio"
                            aria-checked={experienceLevel === exp.id}
                            tabIndex={0}
                        >
                            <span className="experience-emoji">{exp.emoji}</span>
                            <h4 className="experience-title">{exp.title}</h4>
                            <p className="experience-subtitle">{exp.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            <button type="button" className="btn-primary" disabled={!canContinue} onClick={onContinue}>
                Continue
            </button>
            <button type="button" className="link-back" onClick={onBack}>
                ← Back
            </button>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   STEP 3: Personalized Preview
   ═══════════════════════════════════════════ */
const BUDGET_BARS = [35, 55, 40, 72, 48, 30, 64, 38, 58, 70, 42, 52];

function BudgetMockup({ symbol }) {
    return (
        <div className="preview-mockup">
            <div className="preview-mockup-header">
                <span className="preview-mockup-title">Monthly Spending</span>
                <span className="preview-mockup-badge preview-mockup-badge--green">-12% vs last mo.</span>
            </div>
            <div className="preview-mockup-value">
                <AnimatedCount value={4230} prefix={`${symbol} `} />
            </div>
            <SpendingBarPreview height={100} />
            <div style={{ marginTop: 12 }}>
                <CategoryBarsPreview />
            </div>
        </div>
    );
}

function InvestmentMockup({ symbol }) {
    return (
        <div className="preview-mockup">
            <div className="preview-mockup-header">
                <span className="preview-mockup-title">Net Worth</span>
                <span className="preview-mockup-badge preview-mockup-badge--green">+3.2% this month</span>
            </div>
            <div className="preview-mockup-value">
                <AnimatedCount value={52870} prefix={`${symbol} `} />
            </div>
            <NetWorthAreaPreview height={100} />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <AllocationDonutPreview size={90} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, marginLeft: 12 }}>
                    <span className="preview-mockup-pill preview-mockup-pill--gold">📈 Equity</span>
                    <span className="preview-mockup-pill preview-mockup-pill--orange">₿ Crypto</span>
                    <span className="preview-mockup-pill preview-mockup-pill--green">🏦 Fixed Income</span>
                    <span className="preview-mockup-pill preview-mockup-pill--purple">🏠 Real Estate</span>
                </div>
            </div>
        </div>
    );
}

function StepPreview({ selectedGoal, primaryCurrency, onContinue, onBack }) {
    const ctaRef = useRef(null);

    useEffect(() => {
        ctaRef.current?.focus();
    }, []);

    const symbol = CURRENCY_SYMBOLS[primaryCurrency] || primaryCurrency;

    const PREVIEW_MESSAGES = {
        budget: "Here's how you'll master your spending",
        investments: "Here's how you'll track your portfolio",
        both: "Here's the full Finance Funk experience",
    };

    const CALLOUTS = {
        budget: ["Smart categorization", "Savings tracking", "Multi-currency"],
        investments: ["Portfolio ROI", "FX impact analysis", "Asset allocation"],
        both: ["Full dashboard", "Multi-currency", "Smart insights"],
    };

    const showBudget = selectedGoal === "budget" || selectedGoal === "both";
    const showInvestments = selectedGoal === "investments" || selectedGoal === "both";

    return (
        <motion.div key="step-3" {...stepTransition}>
            <ProfessorF
                pose="celebrating"
                message={PREVIEW_MESSAGES[selectedGoal] || PREVIEW_MESSAGES.both}
                animate
            />

            <h1 className="onboarding-heading" style={{ fontSize: "1.5rem", marginTop: 24 }}>
                Your Finance Funk
            </h1>
            <p className="onboarding-subtitle">
                A personalized preview of your dashboard.
            </p>

            {showBudget && <BudgetMockup symbol={symbol} />}
            {showBudget && showInvestments && <hr className="preview-divider" />}
            {showInvestments && <InvestmentMockup symbol={symbol} />}

            <div className="preview-callouts">
                {(CALLOUTS[selectedGoal] || CALLOUTS.both).map((c) => (
                    <span key={c} className="preview-callout">{c}</span>
                ))}
            </div>

            <button ref={ctaRef} type="button" className="btn-primary" onClick={onContinue} style={{ marginTop: 24 }}>
                Create My Account
            </button>
            <button type="button" className="link-back" onClick={onBack}>
                ← Back
            </button>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   STEP 4: Account Creation
   ═══════════════════════════════════════════ */
function StepAccount({
    selectedGoal, primaryCurrency, secondaryCurrency, experienceLevel,
    name, setName, email, setEmail, password, setPassword,
    showPassword, setShowPassword, isLoading, setIsLoading,
    errorMsg, setErrorMsg, router,
}) {
    const nameRef = useRef(null);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleGoogleSignUp = () => {
        sessionStorage.setItem("ff_onboarding", JSON.stringify({
            goal: selectedGoal,
            primaryCurrency,
            secondaryCurrency,
            experienceLevel,
        }));
        signIn("google", { callbackUrl: "/dashboard" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    confirmPassword: password,
                    onboarding_goal: selectedGoal,
                    onboarding_currency_primary: primaryCurrency,
                    onboarding_currency_secondary: secondaryCurrency,
                    onboarding_experience: experienceLevel,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || "An error occurred during registration");
                setIsLoading(false);
                return;
            }

            const signInResult = await signIn("credentials", {
                email,
                password,
                callbackUrl: "/dashboard",
                redirect: true,
            });

            if (signInResult?.error) {
                setErrorMsg("Account created, but couldn't sign in automatically.");
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("A network error occurred.");
            setIsLoading(false);
        }
    };

    return (
        <motion.div key="step-4" {...stepTransition}>
            <ProfessorF
                pose="welcome"
                size="sm"
                message="One last step — let's get you set up!"
                animate
            />

            <h1 className="onboarding-heading" style={{ fontSize: "1.5rem", marginTop: 20 }}>
                Almost There
            </h1>
            <p className="onboarding-subtitle">
                Create your account and start grooving.
            </p>

            {errorMsg && (
                <div className="onboarding-error">
                    <span>⚠</span> {errorMsg}
                </div>
            )}

            {/* Google OAuth */}
            <button type="button" className="google-btn" onClick={handleGoogleSignUp}>
                <GoogleIcon />
                Continue with Google
            </button>

            <div className="onboarding-divider">
                <span>or create with email</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="onboarding-form">
                <div className="onboarding-field">
                    <label htmlFor="ob-name">Name</label>
                    <input
                        ref={nameRef}
                        id="ob-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        autoComplete="name"
                    />
                </div>

                <div className="onboarding-field">
                    <label htmlFor="ob-email">Email</label>
                    <input
                        id="ob-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="onboarding-field">
                    <label htmlFor="ob-password">Password</label>
                    <div className="password-wrapper">
                        <input
                            id="ob-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: 8 }}>
                    {isLoading ? <span className="onboarding-spinner" /> : "🎸 Let's Go!"}
                </button>
            </form>

            <p className="onboarding-footer-link">
                Already have an account?{" "}
                <a href="/login">Sign in</a>
            </p>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════
   Progress Bar
   ═══════════════════════════════════════════ */
const STEPS = ["Vibe", "Setup", "Preview", "Account"];

function ProgressBar({ step }) {
    return (
        <div className="progress-bar">
            {STEPS.map((label, i) => {
                const num = i + 1;
                return (
                    <div key={label} style={{ display: "flex", alignItems: "center" }}>
                        {i > 0 && <div className={`progress-line ${step >= num ? "completed" : ""}`} />}
                        <div className="progress-node">
                            <div className={`progress-dot ${step >= num ? "completed" : ""}`} />
                            <span className={`progress-label ${step === num ? "active" : ""}`}>{label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════
   Onboarding Flow
   ═══════════════════════════════════════════ */
function OnboardingFlow() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [primaryCurrency, setPrimaryCurrency] = useState("USD");
    const [secondaryCurrency, setSecondaryCurrency] = useState(null);
    const [experienceLevel, setExperienceLevel] = useState(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Detect currency from locale on mount
    useEffect(() => {
        setPrimaryCurrency(detectCurrencyFromLocale());
    }, []);

    const isWideStep = step === 3;

    return (
        <div className="onboarding-container">
            <div className="onboarding-backdrop" />

            <div className={`onboarding-card ${isWideStep ? "wide" : ""}`}>
                <ProgressBar step={step} />

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <StepGoal
                            selectedGoal={selectedGoal}
                            setSelectedGoal={setSelectedGoal}
                            onContinue={() => setStep(2)}
                            onSkip={() => {
                                setSelectedGoal("both");
                                setStep(2);
                            }}
                        />
                    )}

                    {step === 2 && (
                        <StepSetup
                            primaryCurrency={primaryCurrency}
                            setPrimaryCurrency={setPrimaryCurrency}
                            secondaryCurrency={secondaryCurrency}
                            setSecondaryCurrency={setSecondaryCurrency}
                            experienceLevel={experienceLevel}
                            setExperienceLevel={setExperienceLevel}
                            onContinue={() => setStep(3)}
                            onBack={() => setStep(1)}
                        />
                    )}

                    {step === 3 && (
                        <StepPreview
                            selectedGoal={selectedGoal}
                            primaryCurrency={primaryCurrency}
                            onContinue={() => setStep(4)}
                            onBack={() => setStep(2)}
                        />
                    )}

                    {step === 4 && (
                        <StepAccount
                            selectedGoal={selectedGoal}
                            primaryCurrency={primaryCurrency}
                            secondaryCurrency={secondaryCurrency}
                            experienceLevel={experienceLevel}
                            name={name} setName={setName}
                            email={email} setEmail={setEmail}
                            password={password} setPassword={setPassword}
                            showPassword={showPassword} setShowPassword={setShowPassword}
                            isLoading={isLoading} setIsLoading={setIsLoading}
                            errorMsg={errorMsg} setErrorMsg={setErrorMsg}
                            router={router}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="onboarding-container"><div className="onboarding-card" /></div>}>
            <OnboardingFlow />
        </Suspense>
    );
}
