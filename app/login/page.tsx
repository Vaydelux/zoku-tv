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
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="glass-panel relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl animate-slide-up">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-5 focus:outline-none">
              <BrandMark size="lg" />
            </Link>

            <div
              data-testid="auth-storage-mode-badge"
              className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                isCloudFirebaseConfigured
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/35 bg-amber-500/10 text-amber-300"
              }`}
            >
              {isCloudFirebaseConfigured ? (
                <>
                  <Cloud className="h-3 w-3" />
                  <span>Cloud Sync Enabled</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3" />
                  <span>Local Device Mode</span>
                </>
              )}
            </div>

            <h1 className="text-2xl font-display font-semibold tracking-tight text-on-surface">
              Welcome Back
            </h1>
            <p className="mt-2 text-xs text-on-surface-variant max-w-xs">
              Connect your streaming dashboard, customize your space, and start watching.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-fade-in"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-email"
                className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border-custom bg-background/60 py-2.5 pl-10 pr-4 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border-custom bg-background/60 py-2.5 pl-10 pr-4 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-semibold text-primary-contrast hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  <span>Accessing Channel...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Zoku TV</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-custom" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="rounded-md bg-surface px-2.5 py-0.5 text-on-surface-variant">
                Or Stream with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="theme-panel w-full flex items-center justify-center gap-3 rounded-xl hover:bg-surface-hover py-2.5 px-4 text-xs text-on-surface font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
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
          <div className="flex min-h-[100dvh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </BrandShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
