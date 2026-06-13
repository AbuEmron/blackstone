import { jsPDF } from "jspdf";

/*
  A "report" is a normalized object:
  { type, title, subtitle, rows: [[label, value], ...], photos: [url], }
*/

function filename(r) {
  const d = new Date().toISOString().slice(0, 10);
  return `Blackstone-${(r.type || "report").replace(/\s+/g, "")}-${d}.pdf`;
}

function summaryText(r) {
  const lines = [`BLACKSTONE SECURITY`, r.title || "Report"];
  if (r.subtitle) lines.push(r.subtitle);
  lines.push("");
  (r.rows || []).forEach(([k, v]) => lines.push(`${k}: ${v ?? "—"}`));
  if (r.photos && r.photos.length) {
    lines.push("", `Photos (${r.photos.length}):`);
    r.photos.forEach((u) => lines.push(u));
  }
  return lines.join("\n");
}

export function buildPdf(r) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("BLACKSTONE SECURITY", M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text("Protection · Accountability · Excellence", M, y + 16);
  doc.setDrawColor(200); doc.line(M, y + 26, W - M, y + 26);
  y += 50;

  doc.setTextColor(20); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(r.title || "Report", M, y); y += 18;
  if (r.subtitle) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
    doc.text(r.subtitle, M, y); y += 18;
  }
  y += 6;
  doc.setTextColor(20);

  (r.rows || []).forEach(([k, v]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(`${k}`, M, y);
    doc.setFont("helvetica", "normal");
    const text = String(v ?? "—");
    const wrapped = doc.splitTextToSize(text, W - M - 150);
    doc.text(wrapped, M + 110, y);
    y += Math.max(16, wrapped.length * 13);
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 56; }
  });

  if (r.photos && r.photos.length) {
    y += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(`Photo evidence (${r.photos.length})`, M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90);
    r.photos.forEach((u) => {
      const wrapped = doc.splitTextToSize(u, W - M * 2);
      doc.text(wrapped, M, y); y += wrapped.length * 11 + 2;
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 56; }
    });
  }

  doc.setFontSize(8); doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()}`, M, doc.internal.pageSize.getHeight() - 30);
  return doc;
}

export function downloadPdf(r) {
  buildPdf(r).save(filename(r));
}

export function printReport(r) {
  const rows = (r.rows || [])
    .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;font-weight:600;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${(v ?? "—").toString().replace(/</g, "&lt;")}</td></tr>`)
    .join("");
  const photos = (r.photos || []).map((u) => `<img src="${u}" style="width:140px;height:140px;object-fit:cover;margin:4px;border:1px solid #ccc"/>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${r.title || "Report"}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:40px}h1{letter-spacing:3px;margin:0}h2{margin:18px 0 4px}.sub{color:#666;font-size:13px}hr{border:none;border-top:1px solid #ccc;margin:14px 0}table{border-collapse:collapse;font-size:13px}</style>
    </head><body>
    <h1>BLACKSTONE SECURITY</h1><div class="sub">Protection · Accountability · Excellence</div><hr/>
    <h2>${r.title || "Report"}</h2><div class="sub">${r.subtitle || ""}</div>
    <table>${rows}</table>
    ${photos ? `<h2>Photo evidence</h2><div>${photos}</div>` : ""}
    <hr/><div class="sub">Generated ${new Date().toLocaleString()}</div>
    </body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const d = iframe.contentWindow.document;
  d.open(); d.write(html); d.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  }, 350);
}

export function emailReport(r) {
  const subject = encodeURIComponent(`Blackstone — ${r.title || "Report"}`);
  const body = encodeURIComponent(summaryText(r) + "\n\n(Attach the exported PDF if needed.)");
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function textReport(r) {
  const body = encodeURIComponent(summaryText(r));
  window.location.href = `sms:?&body=${body}`;
}

export function canShare() {
  return typeof navigator !== "undefined" && !!navigator.canShare;
}

export async function shareReport(r) {
  try {
    const blob = buildPdf(r).output("blob");
    const file = new File([blob], filename(r), { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: r.title || "Report", text: r.subtitle || "" });
      return;
    }
    if (navigator.share) { await navigator.share({ title: r.title || "Report", text: summaryText(r) }); return; }
  } catch { /* user cancelled or unsupported */ }
  downloadPdf(r);
}
