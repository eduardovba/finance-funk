"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../login/login.css";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || "Registration failed.");
                setIsLoading(false);
                return;
            }

            // Success — redirect to login with success message
            router.push("/login?registered=true");
        } catch (err) {
            setErrorMsg("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-backdrop" />

            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <span className="login-logo-icon">◉</span>
                    </div>
                    <h1 className="login-title">Create Account</h1>
                    <p className="login-subtitle">Join Finance Funk</p>
                </div>

                {/* Error Message */}
                {errorMsg && (
                    <div className="login-error">
                        <span>⚠</span> {errorMsg}
                    </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleRegister} className="login-form">
                    <div className="login-field">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                            autoComplete="name"
                        />
                    </div>

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
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            autoComplete="new-password"
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
                            "Create Account"
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <p className="login-register-link">
                    Already have an account?{" "}
                    <a href="/login">Sign in</a>
                </p>
            </div>
        </div>
    );
}
