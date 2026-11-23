import { Badge } from "@/components/ui/badge";
import type { RecipientStatus } from "@/lib/db/schema";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export function RecipientStatusBadge({ status }: { status: RecipientStatus }) {
  switch (status) {
    case "sent":
      return (
        <Badge variant="success" className="gap-1.5 font-normal">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Terkirim</span>
        </Badge>
      );
    case "sending":
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 font-normal bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Mengirim...</span>
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1.5 font-normal">
          <XCircle className="w-3.5 h-3.5" />
          <span>Gagal</span>
        </Badge>
      );
    case "unknown":
      return (
        <Badge variant="warning" className="gap-1.5 font-normal">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Tidak Pasti</span>
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 font-normal text-neutral-600 dark:text-neutral-400"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Menunggu</span>
        </Badge>
      );
  }
}
