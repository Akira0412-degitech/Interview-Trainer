"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed.");
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
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="space-y-1.5">
          <PasswordField
            id="password"
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end pt-0.5">
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-400 hover:text-orange-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>

      <p className="text-center text-sm text-zinc-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
