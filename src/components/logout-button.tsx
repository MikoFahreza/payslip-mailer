"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
      className="text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isPending ? "Keluar..." : "Keluar"}
    </Button>
  );
}
