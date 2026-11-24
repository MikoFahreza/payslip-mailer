"use client";

import { useState, useActionState } from "react";
import {
  loginWithGoogleAction,
  loginWithCredentialsAction,
  registerUserAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, User, CheckCircle2 } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthForm({ initialError }: { initialError?: string }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  const [loginState, loginFormAction, isLoginPending] = useActionState(
    loginWithCredentialsAction,
    null
  );

  const [registerState, registerFormAction, isRegisterPending] = useActionState(
    registerUserAction,
    null
  );

  return (
    <div className="space-y-6">
      {/* 1. Google OAuth Button (Auto connects Gmail & logs in immediately) */}
      <form action={loginWithGoogleAction}>
        <Button
          type="submit"
          size="lg"
          variant="outline"
          className="w-full h-12 font-semibold text-sm flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white border-neutral-300 dark:border-neutral-700 shadow-sm transition-all"
        >
          <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          <span>Masuk dengan Google (Langsung Terhubung Gmail)</span>
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
        <span className="bg-white dark:bg-neutral-900 px-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">
          atau via email
        </span>
      </div>

      {/* Tab Switcher: Masuk vs Daftar Akun */}
      <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === "login"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === "register"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
          }`}
        >
          Daftar Akun Baru
        </button>
      </div>

      {/* Error or Success Alerts */}
      {initialError && !loginState?.error && !registerState?.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span>
            {initialError === "OAuthSignin" || initialError === "OAuthCallback"
              ? "Gagal menghubungkan dengan Google. Silakan periksa kembali."
              : initialError === "AccessDenied"
              ? "Akses ditolak oleh Google. Pastikan email Anda disetujui."
              : "Terjadi kendala saat proses autentikasi."}
          </span>
        </div>
      )}

      {/* Tab: LOGIN */}
      {tab === "login" && (
        <form action={loginFormAction} className="space-y-4">
          {loginState?.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{loginState.error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs">
              Alamat Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                placeholder="nama@email.com"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs">
              Kata Sandi
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoginPending}
            className="w-full h-10 font-semibold text-sm"
          >
            {isLoginPending ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      )}

      {/* Tab: REGISTER */}
      {tab === "register" && (
        <form action={registerFormAction} className="space-y-4">
          {registerState?.error && (
            <div
              role="alert"
              className={`flex items-start gap-2.5 p-3 text-xs rounded-lg border ${
                registerState.registered
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                  : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900"
              }`}
            >
              {registerState.registered ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              )}
              <span>{registerState.error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs">
              Nama Lengkap
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="reg-name"
                name="name"
                type="text"
                required
                placeholder="Nama Anda"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs">
              Alamat Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="reg-email"
                name="email"
                type="email"
                required
                placeholder="nama@email.com"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="text-xs">
              Kata Sandi (Minimal 6 karakter)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="reg-password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isRegisterPending}
            className="w-full h-10 font-semibold text-sm"
          >
            {isRegisterPending ? "Mendaftarkan..." : "Daftar Akun"}
          </Button>

          <p className="text-xs text-neutral-500 text-center">
            Setelah mendaftar, Anda dapat menghubungkan akun Gmail Anda kapan saja di menu Pengaturan.
          </p>
        </form>
      )}
    </div>
  );
}
