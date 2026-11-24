"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { sendRecipient } from "@/lib/actions/send";
import { useRouter } from "next/navigation";
import type { RecipientStatus } from "@/lib/db/schema";

interface SendSingleButtonProps {
  recipientId: string;
  recipientName: string;
  status: RecipientStatus;
}

export function SendSingleButton({ recipientId, recipientName, status }: SendSingleButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  // Allowed to send if status is pending or failed
  const canSend = status === "pending" || status === "failed";

  if (!canSend) {
    return null;
  }

  const handleSend = async () => {
    if (isSending) return;

    setIsSending(true);
    try {
      const res = await sendRecipient(recipientId);
      if (!res.success && res.status !== "skipped") {
        alert(`Gagal mengirim ke ${recipientName}: ${res.error || "Terjadi kesalahan"}`);
      }
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Terjadi kesalahan sistem saat mengirim: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2 text-xs text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 gap-1.5"
      onClick={handleSend}
      disabled={isSending}
      title={status === "failed" ? "Kirim ulang email ini" : "Kirim email ini sekarang"}
    >
      {isSending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Mengirim...</span>
        </>
      ) : (
        <>
          <Send className="w-3.5 h-3.5" />
          <span>{status === "failed" ? "Kirim Ulang" : "Kirim"}</span>
        </>
      )}
    </Button>
  );
}
