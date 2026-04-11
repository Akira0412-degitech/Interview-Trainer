"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call POST /api/auth/login with { email, password }
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

        <SubmitButton>Sign in</SubmitButton>
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
