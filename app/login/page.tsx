"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ShieldCheck, ArrowRight, Cloud, HardDrive } from "lucide-react";
import { loginWithEmail, loginWithGoogle, isCloudFirebaseConfigured } from "@/lib/firebase";
import { Spinner } from "@/components/Spinner";
import { GoogleAuthBadge } from "@/components/GoogleAuthBadge";
import { BrandMark } from "@/components/BrandMark";
import { BrandShell } from "@/components/BrandShell";
import { AuthThemePicker } from "@/components/AuthThemePicker";
import { resolvePostLoginPath } from "@/lib/auth-routes";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      await loginWithEmail(email, password);
      redirectAfterAuth(false);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
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
      <AuthThemePicker />
      <div className="flex min-h-[100dvh] items-center justify-center px-4 pt-16 pb-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="glass-panel relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-6 sm:p-8 shadow-2xl animate-slide-up">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{ backgroundImage: "var(--button-gradient)" }}
          />
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4 focus:outline-none">
              <BrandMark size="lg" />
            </Link>

            <div
              data-testid="auth-storage-mode-badge"
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant"
            >
              {isCloudFirebaseConfigured ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Cloud sync enabled</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Local device mode</span>
                </>
              )}
            </div>

            <h1 className="text-2xl font-display font-bold tracking-tight text-on-surface">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-on-surface-variant max-w-xs leading-relaxed">
              Sign in to access your profiles, watchlist, and streaming servers.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs font-medium text-red-500 animate-fade-in"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-on-surface-variant mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] rounded-xl border border-border-custom bg-background/70 py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-on-surface-variant mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] rounded-xl border border-border-custom bg-background/70 py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-primary-contrast hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Zoku TV</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-custom" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-on-surface-variant">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-3 rounded-xl border border-border-custom bg-background/60 hover:bg-surface-hover py-2.5 px-4 text-sm text-on-surface font-semibold transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <Spinner className="h-4 w-4" /> : <GoogleAuthBadge className="h-4 w-4" />}
            <span>
              {isCloudFirebaseConfigured ? "Continue with Google" : "Quick Local Demo Sign-In"}
            </span>
          </button>

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create Profile Free
            </Link>
          </p>
        </div>
      </div>
    </BrandShell>
  );
}

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
