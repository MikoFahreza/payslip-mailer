"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Lock, Mail } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-neutral-200 dark:border-neutral-800">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-2">
          <Lock className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Masuk Admin</CardTitle>
        <CardDescription>
          Masukkan kredensial admin untuk mengakses dashboard pengiriman slip gaji.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-3 p-3 text-sm rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Alamat Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full font-medium" disabled={isPending}>
            {isPending ? "Memverifikasi..." : "Masuk ke Sistem"}
          </Button>
          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
            Akses terbatas hanya untuk administrator resmi perusahaan.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
