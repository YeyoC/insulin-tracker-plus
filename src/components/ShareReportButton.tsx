import { useState } from "react";
import { Share2, MessageCircle, Mail, X } from "lucide-react";
import type { GlucoseEntry, InsulinEntry, Profile } from "@/lib/storage";
import { buildReport, exportReport } from "@/lib/exportPdf";
import { type Period, periodLabel } from "@/lib/stats";
import { t } from "@/lib/i18n";

function toast(message: string) {
  window.dispatchEvent(new CustomEvent("insulina:saved", { detail: { message } }));
}

export function ShareReportButton(props: {
  profile: Profile | null;
  period: Period;
  glucose: GlucoseEntry[];
  insulin: InsulinEntry[];
}) {
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const patient = props.profile?.name?.trim() || "—";
  const date = new Date().toLocaleDateString();
  const subject = `${t("share.subject")} - ${patient} - ${date}`;
  const body = `${t("share.body", { patient, period: periodLabel[props.period], date })}`;

  const handleShare = async () => {
    try {
      const { blob, filename } = buildReport(props);
      const file = new File([blob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ title: subject, text: body, files: [file] });
        toast(t("share.shared"));
        return;
      }
      setFallbackOpen(true);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      toast(t("share.error"));
    }
  };

  const openWhatsApp = () => {
    exportReport(props);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${body}\n\n${t("share.attachNote")}`)}`,
      "_blank",
      "noopener",
    );
    setFallbackOpen(false);
    toast(t("share.downloadedAttach"));
  };

  const openEmail = () => {
    exportReport(props);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `${body}\n\n${t("share.attachNote")}`,
    )}`;
    setFallbackOpen(false);
    toast(t("share.downloadedAttach"));
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-card py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-accent"
      >
        <Share2 className="size-4" />
        {t("share.button")}
      </button>

      {fallbackOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60"
          onPointerDown={() => setFallbackOpen(false)}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-border bg-card p-4 pb-8 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-primary">{t("share.title")}</h3>
              <button
                onClick={() => setFallbackOpen(false)}
                aria-label={t("common.cancel")}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{t("share.attachNote")}</p>
            <div className="space-y-2">
              <button
                onClick={openWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-success-foreground shadow"
              >
                <MessageCircle className="size-4" />
                {t("share.whatsapp")}
              </button>
              <button
                onClick={openEmail}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow"
              >
                <Mail className="size-4" />
                {t("share.email")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
