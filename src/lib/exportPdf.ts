import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GlucoseEntry, InsulinEntry, Profile } from "./storage";
import {
  type Period,
  periodLabel,
  periodStart,
  glucoseStats,
  avgDailyInsulin,
  siteUsage,
  SITES,
} from "./stats";

export function exportReport({
  profile,
  period,
  glucose,
  insulin,
}: {
  profile: Profile | null;
  period: Period;
  glucose: GlucoseEntry[];
  insulin: InsulinEntry[];
}) {
  const doc = new jsPDF();
  const now = new Date();
  const start = periodStart(period, now);
  const stats = glucoseStats(glucose, profile?.rangeMin ?? 70, profile?.rangeMax ?? 180);
  const ins = avgDailyInsulin(
    insulin,
    period,
    profile?.basalInsulinType ?? "NPH",
    profile?.rapidInsulinType ?? "Lispro",
  );
  const usage = siteUsage(insulin);

  let y = 14;
  doc.setFontSize(16);
  doc.setTextColor("#1A3A5C");
  doc.text("InsulinaApp — Doctor Report", 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(`Patient: ${profile?.name ?? "—"}`, 14, y);
  y += 5;
  doc.text(
    `Period: ${periodLabel[period]}  (${start.toLocaleDateString()} – ${now.toLocaleDateString()})`,
    14,
    y,
  );
  y += 5;
  doc.text(`Generated: ${now.toLocaleString()}`, 14, y);
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor("#1A3A5C");
  doc.text("Summary", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [["Metric", "Value"]],
    body: [
      ["Readings", String(stats.count)],
      ["Overall average", `${stats.overallAvg.toFixed(0)} mg/dL`],
      ["Fasting average", `${stats.fastingAvg.toFixed(0)} mg/dL`],
      ["Post-meal average", `${stats.postMealAvg.toFixed(0)} mg/dL`],
      ["Time in range 70–180", `${stats.inRangePct.toFixed(0)}% (${stats.inRange})`],
      ["Below 70", `${stats.belowPct.toFixed(0)}% (${stats.below})`],
      ["Above 180", `${stats.abovePct.toFixed(0)}% (${stats.above})`],
      ["Avg daily NPH", `${ins.nph.toFixed(1)} U`],
      ["Avg daily Lispro", `${ins.lispro.toFixed(1)} U`],
    ],
    headStyles: { fillColor: [26, 58, 92] },
    styles: { fontSize: 10 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(12);
  doc.setTextColor("#1A3A5C");
  doc.text("Injection sites", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Site", "Times used"]],
    body: SITES.map((s) => [s, String(usage[s])]),
    headStyles: { fillColor: [26, 107, 154] },
    styles: { fontSize: 10 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(12);
  doc.setTextColor("#1A3A5C");
  doc.text("Glucose readings", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Date/time", "mg/dL", "Moment", "Notes"]],
    body: [...glucose]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((g) => [
        new Date(g.timestamp).toLocaleString(),
        String(g.value),
        g.moment,
        g.notes ?? "",
      ]),
    headStyles: { fillColor: [26, 58, 92] },
    styles: { fontSize: 9 },
  });

  const filename = `InsulinaApp_Report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
