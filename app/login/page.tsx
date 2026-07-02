"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tv, Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { loginWithEmail, loginWithGoogle, useSessionStore } from "@/stores";

export default function LoginPage() {
  const router = useRouter();
  const { user, currentProfile, initializing } = useSessionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      if (!currentProfile) {
        router.replace("/profiles");
      } else {
        router.replace("/home");
      }
    }
  }, [user, currentProfile, initializing, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/profiles");
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
      router.push("/profiles");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-black">
      {/* Immersive Cinematic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920')" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border-custom bg-surface/70 p-8 shadow-2xl backdrop-blur-xl animate-slide-up">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 text-primary focus:outline-none mb-6">
            <Tv className="h-10 w-10 animate-bounce" />
            <span className="font-display text-2xl font-bold tracking-wider text-on-surface">
              ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
            </span>
          </Link>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-on-surface">Welcome Back</h2>
          <p className="mt-2 text-xs text-on-surface-variant max-w-xs">
            Connect your streaming dashboard, customize your space, and start watching.
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500 animate-fade-in">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border-custom bg-background/50 py-2.5 pl-10 pr-4 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">Password</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border-custom bg-background/50 py-2.5 pl-10 pr-4 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-semibold text-white hover:bg-opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
          >
            {loading ? "Accessing Channel..." : "Sign In to Zoku TV"}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-custom" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono">
            <span className="bg-surface px-2 text-on-surface-variant">Or Stream with</span>
          </div>
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-border-custom bg-background/40 hover:bg-surface-hover py-2.5 px-4 text-xs text-on-surface font-semibold transition-all duration-300 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create Profile Free
          </Link>
        </p>
      </div>
    </div>
  );
}
