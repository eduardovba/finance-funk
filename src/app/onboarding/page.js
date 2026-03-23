"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import "./onboarding.css";

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

function CheckIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

/* ═══════════════════════════════════════════
   Onboarding Flow
   ═══════════════════════════════════════════ */
function OnboardingFlow() {
    const router = useRouter();

    // Flow state
    const [step, setStep] = useState(1);
    const [selectedGoals, setSelectedGoals] = useState([]);

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Handlers
    const handleGoalSelect = (goal) => {
        setSelectedGoals(prev => 
            prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
        );
    };

    const handleSkipGoal = () => {
        setSelectedGoals([]);
        setStep(3); // Skip preview
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match");
            return;
        }

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
                    confirmPassword,
                    onboarding_goal: selectedGoals.length > 0 ? selectedGoals.join(",") : null
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || "An error occurred during registration");
                setIsLoading(false);
                return;
            }

            // Registration successful, auto sign-in
            const signInResult = await signIn("credentials", {
                email,
                password,
                callbackUrl: "/dashboard",
                redirect: true, // redirect will handle the navigation to dashboard
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
        <div className="onboarding-container">
            <div className="onboarding-backdrop" />

            <div className={`onboarding-card ${step === 2 ? "wide" : ""}`}>
                {/* Progress Bar */}
                <div className="progress-bar">
                    <div className="progress-node">
                        <div className={`progress-dot ${step >= 1 ? "completed" : ""}`} />
                        <span className={`progress-label ${step === 1 ? "active" : ""}`}>Goal</span>
                    </div>
                    <div className={`progress-line ${step >= 2 ? "completed" : ""}`} />
                    <div className="progress-node">
                        <div className={`progress-dot ${step >= 2 ? "completed" : ""}`} />
                        <span className={`progress-label ${step === 2 ? "active" : ""}`}>Preview</span>
                    </div>
                    <div className={`progress-line ${step >= 3 ? "completed" : ""}`} />
                    <div className="progress-node">
                        <div className={`progress-dot ${step >= 3 ? "completed" : ""}`} />
                        <span className={`progress-label ${step === 3 ? "active" : ""}`}>Account</span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <motion.div key="step-1" {...stepTransition}>
                            <h1 className="onboarding-heading" style={{ fontSize: "1.6rem" }}>
                                What brings you to Finance Funk?
                            </h1>
                            <p className="onboarding-subtitle">
                                Choose your focus — you can always use both later.
                            </p>

                            <div className="goal-cards">
                                <div
                                    className={`goal-card ${selectedGoals.includes("budget") ? "selected" : ""}`}
                                    onClick={() => handleGoalSelect("budget")}
                                >
                                    <div className="goal-check"><CheckIcon /></div>
                                    <div className="goal-icon">
                                        <WalletIcon color="#D4AF37" />
                                    </div>
                                    <h3 className="goal-title">Budget Tracking</h3>
                                    <p className="goal-desc">
                                        Track spending, manage categories, and hit your savings goals.
                                    </p>
                                </div>

                                <div
                                    className={`goal-card ${selectedGoals.includes("investments") ? "selected" : ""}`}
                                    onClick={() => handleGoalSelect("investments")}
                                >
                                    <div className="goal-check"><CheckIcon /></div>
                                    <div className="goal-icon">
                                        <ChartIcon color="#CC5500" />
                                    </div>
                                    <h3 className="goal-title">Investment Tracking</h3>
                                    <p className="goal-desc">
                                        Monitor your portfolio, track returns, and manage multi-currency assets.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn-primary"
                                disabled={selectedGoals.length === 0}
                                onClick={() => setStep(2)}
                            >
                                Continue
                            </button>
                            <button
                                type="button"
                                className="link-skip"
                                onClick={handleSkipGoal}
                            >
                                Skip for now
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <motion.div key="step-2" {...stepTransition}>
                            <h1 className="onboarding-heading" style={{ fontSize: "1.4rem" }}>
                                {selectedGoals.length === 2
                                    ? "Here's how you'll track everything"
                                    : selectedGoals.includes("budget")
                                        ? "Here's how you'll track your spending"
                                        : "Here's how you'll track your portfolio"}
                            </h1>
                            <p className="onboarding-subtitle">
                                This is your actual dashboard — real-time data, at a glance.
                            </p>

                            <img
                                src="/ftue/screenshot.png"
                                alt="Dashboard preview"
                                className="preview-screenshot"
                            />

                            <div className="preview-callouts">
                                {selectedGoals.length === 2 ? (
                                    <>
                                        <span className="preview-callout">Smart categorization</span>
                                        <span className="preview-callout">Portfolio ROI tracking</span>
                                        <span className="preview-callout">Multi-currency support</span>
                                    </>
                                ) : selectedGoals.includes("budget") ? (
                                    <>
                                        <span className="preview-callout">Smart categorization</span>
                                        <span className="preview-callout">Savings rate tracking</span>
                                        <span className="preview-callout">Multi-currency support</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="preview-callout">Portfolio ROI tracking</span>
                                        <span className="preview-callout">FX impact analysis</span>
                                        <span className="preview-callout">Asset allocation view</span>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => setStep(3)}
                                style={{ marginTop: "24px" }}
                            >
                                Create my account
                            </button>
                            <button
                                type="button"
                                className="link-back"
                                onClick={() => setStep(1)}
                            >
                                ← Back
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <motion.div key="step-3" {...stepTransition}>
                            <h1 className="onboarding-heading" style={{ fontSize: "1.6rem" }}>
                                Create your account
                            </h1>
                            <p className="onboarding-subtitle">
                                One more step to get your finances grooving.
                            </p>

                            {errorMsg && (
                                <div className="onboarding-error">
                                    <span>⚠</span> {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="onboarding-form">
                                <div className="onboarding-field">
                                    <label htmlFor="name">Name</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />
                                </div>

                                <div className="onboarding-field">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>

                                <div className="onboarding-field">
                                    <label htmlFor="password">Password</label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="onboarding-field">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="onboarding-spinner" />
                                    ) : (
                                        "Let's Go"
                                    )}
                                </button>
                            </form>

                            <button
                                type="button"
                                className="link-back"
                                onClick={() => setStep(selectedGoals.length > 0 ? 2 : 1)}
                            >
                                ← Back
                            </button>

                            <p className="onboarding-footer-link">
                                Already have an account?{" "}
                                <a href="/login">Sign in</a>
                            </p>
                        </motion.div>
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
