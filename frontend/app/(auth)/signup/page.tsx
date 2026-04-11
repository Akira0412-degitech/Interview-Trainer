"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordMismatch) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/session");
    } catch {
      setError("Server error. Make sure the backend and database are running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start your interview preparation journey"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="name"
          label="Full name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <FormField
          id="email"
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          id="password"
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordField
          id="confirm-password"
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={passwordMismatch ? "Passwords do not match" : undefined}
          required
        />

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
            />
            <div
              className={`w-4 h-4 rounded border transition-colors ${
                agreedToTerms
                  ? "bg-orange-500 border-orange-500"
                  : "bg-zinc-800 border-zinc-600 group-hover:border-zinc-400"
              } flex items-center justify-center`}
            >
              {agreedToTerms && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-zinc-400 leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" className="text-orange-400 hover:text-orange-300 transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-orange-400 hover:text-orange-300 transition-colors">
              Privacy Policy
            </Link>
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <SubmitButton loading={loading} disabled={passwordMismatch || !agreedToTerms}>
          Create account
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-zinc-500 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
