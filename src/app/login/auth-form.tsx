"use client";

import { useActionState } from "react";
import { loginWithCredentialsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, ShieldAlert } from "lucide-react";

export function AuthForm({ initialError }: { initialError?: string }) {
  const [loginState, loginFormAction, isLoginPending] = useActionState(
    loginWithCredentialsAction,
    null
  );

  return (
    <div className="space-y-5">
      {initialError && !loginState?.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span>Terjadi kendala saat proses autentikasi. Silakan masuk kembali.</span>
        </div>
      )}

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
              autoComplete="email"
              placeholder="nama@perusahaan.com"
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
              autoComplete="current-password"
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

      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-neutral-500" />
        <span>
          Akses aplikasi dikelola secara internal. Belum punya akun? Hubungi{" "}
          <strong className="text-neutral-800 dark:text-neutral-200">Administrator</strong> untuk
          pembuatan akun.
        </span>
      </div>
    </div>
  );
}
