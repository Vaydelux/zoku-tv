"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, ShieldCheck, ArrowRight, Cloud, HardDrive } from "lucide-react";
import { signupWithEmail, loginWithGoogle, isCloudFirebaseConfigured } from "@/lib/firebase";
import { Spinner } from "@/components/Spinner";
import { GoogleAuthBadge } from "@/components/GoogleAuthBadge";
import { BrandMark } from "@/components/BrandMark";
import { BrandShell } from "@/components/BrandShell";
import { AuthThemePicker } from "@/components/AuthThemePicker";
import { resolvePostLoginPath } from "@/lib/auth-routes";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectAfterAuth = (hasProfile: boolean) => {
    router.push(resolvePostLoginPath(hasProfile, searchParams.get("next")));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signupWithEmail(email, password, name);
      redirectAfterAuth(false);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      redirectAfterAuth(false);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandShell>
      {/* Top Floating Brand Dynamic Island Pill */}
      <div className="pointer-events-none fixed inset-x-0 top-3 sm:top-5 z-30 flex justify-center px-4">
        <div
          data-testid="auth-storage-mode-badge"
          className="dynamic-island-capsule pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[11px] font-semibold text-white"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isCloudFirebaseConfigured ? "bg-emerald-400" : "bg-sky-400"
            }`}
          />
          {isCloudFirebaseConfigured ? (
            <>
              <Cloud className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              <span>Cloud Sync Enabled</span>
            </>
          ) : (
            <>
              <HardDrive className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
              <span>Local Device Mode</span>
            </>
          )}
        </div>
      </div>

      <AuthThemePicker />

      <div className="flex min-h-[100dvh] items-center justify-center px-4 pt-20 pb-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="liquid-glass-elevated relative z-10 w-full max-w-md overflow-hidden rounded-[30px] p-6 sm:p-8 animate-slide-up">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-[2px] rounded-full opacity-90"
            style={{ backgroundImage: "var(--button-gradient)" }}
          />
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4 focus:outline-none">
              <BrandMark size="lg" />
            </Link>

            <h1 className="text-2xl sm:text-[28px] font-display font-bold tracking-tight text-on-surface">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-on-surface-variant max-w-xs leading-relaxed">
              Set up your personal profiles, custom Liquid Glass themes, and saved watchlists.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-center gap-2 rounded-2xl bg-red-500/12 border border-red-500/30 p-3.5 text-xs font-medium text-red-400 animate-fade-in"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-semibold text-on-surface-variant mb-1.5"
              >
                Your name
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="signup-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full min-h-[48px] rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-subtle)] py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-semibold text-on-surface-variant mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[48px] rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-subtle)] py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold text-on-surface-variant mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full min-h-[48px] rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-subtle)] py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="liquid-glass-cta group w-full min-h-[48px] flex items-center justify-center gap-2 rounded-full py-2.5 px-5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Sign Up for Zoku TV</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--glass-border)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="rounded-full bg-[var(--glass-bg-elevated)] px-3 py-0.5 text-on-surface-variant">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="liquid-glass-pill w-full min-h-[48px] flex items-center justify-center gap-3 rounded-full py-2.5 px-4 text-sm text-on-surface font-semibold disabled:opacity-50"
          >
            {loading ? <Spinner className="h-4 w-4" /> : <GoogleAuthBadge className="h-4 w-4" />}
            <span>
              {isCloudFirebaseConfigured ? "Continue with Google" : "Quick Local Demo Sign-In"}
            </span>
          </button>

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </BrandShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <BrandShell>
          <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4">
            <BrandMark size="lg" pulse />
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </BrandShell>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
