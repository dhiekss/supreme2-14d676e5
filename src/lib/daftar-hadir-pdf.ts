import { jsPDF } from "jspdf";
import { addHtmlPageToPdf, loadLogoDataUrl, escapeHtml } from "./pdf-html-common";
import { fetchDisplaySettings } from "./display-settings";
import type { DaftarHadirData, DaftarHadirRombelData } from "./daftar-hadir.functions";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
// Indonesian day letter starting Minggu..Sabtu → M S S R K J S
const HARI_LETTER: Record<number, string> = { 0: "M", 1: "S", 2: "S", 3: "R", 4: "K", 5: "J", 6: "S" };

const COLOR_WEEKEND_BG = "#F6C1BE"; // pinkish for Sabtu/Minggu
const COLOR_LIBUR_BG = "#C6EFCE";   // green for libur
const COLOR_LIBUR_TEXT = "#0F6A2F";
const COLOR_HEADER_RED = "#C81E1E"; // red day letter/date for weekend & libur
const COLOR_EMPTY_BG = "#F6C1BE";   // same pink for cells with no data on weekdays

const STATUS_DOT = "·"; // for Hadir

type PdfOptions = {
  kosong?: boolean; // if true, output blank sheet (no cell contents)
  overrideWaliName?: string | null;
  overrideWaliNip?: string | null;
};

function pad2(n: number) { return String(n).padStart(2, "0"); }

function isoDate(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

async function schoolLogoDataUrl(): Promise<string | null> {
  try {
    const s = await fetchDisplaySettings();
    return s.logo_url && s.logo_url.startsWith("data:") ? s.logo_url : (s.logo_url || null);
  } catch {
    return null;
  }
}

function kopHtml(logoJabar: string, logoSekolah: string | null): string {
  return `
  <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="width:110px; vertical-align:middle; text-align:center;">
        <img src="${logoJabar}" style="width:80px; height:auto;" />
      </td>
      <td style="text-align:center; vertical-align:middle; line-height:1.25;">
        <div style="font-size:13px;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</div>
        <div style="font-size:13px;">DINAS PENDIDIKAN</div>
        <div style="font-size:13px;">CABANG DINAS PENDIDIKAN WILAYAH IV</div>
        <div style="font-size:17px; font-weight:bold; margin-top:2px;">SMK NEGERI 1 PUSAKANAGARA</div>
        <div style="font-size:10.5px;">Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240</div>
        <div style="font-size:10.5px;">Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com</div>
        <div style="font-size:10.5px;">SUBANG - 41255</div>
      </td>
      <td style="width:110px; vertical-align:middle; text-align:center;">
        ${logoSekolah ? `<img src="${logoSekolah}" style="width:80px; height:auto;" />` : ""}
      </td>
    </tr>
  </table>
  <div style="border-top:3px solid #000; border-bottom:1px solid #000; height:3px; margin-bottom:8px;"></div>
  `;
}

function titleHtml(tahunAjaran: string | null, rombelName: string): string {
  return `
  <div style="text-align:center; font-weight:bold; font-size:14px; line-height:1.3;">
    <div>DAFTAR HADIR MURID</div>
    <div>SMKN 1 PUSAKANAGARA</div>
    <div>TAHUN PELAJARAN ${escapeHtml(tahunAjaran || "-")}</div>
  </div>
  <div style="margin:6px 0 4px 6px; font-size:11px;">Kelas : <b>${escapeHtml(rombelName)}</b></div>
  `;
}

function buildAttendanceTable(
  r: DaftarHadirRombelData,
  month: number,
  year: number,
  liburSet: Set<string>,
  kosong: boolean,
): string {
  const lastDay = new Date(year, month, 0).getDate();
  const days: { d: number; dow: number; isWeekend: boolean; isLibur: boolean; iso: string }[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const iso = isoDate(year, month, d);
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isLibur = liburSet.has(iso);
    days.push({ d, dow, isWeekend, isLibur, iso });
  }

  const th = `padding:0px 1px; border:1px solid #000; text-align:center; font-size:7.5px; background:#fff; line-height:1.1;`;
  const thWide = `padding:1px 2px; border:1px solid #000; text-align:center; font-size:9px; background:#fff; line-height:1.15;`;
  const td = `padding:1px 2px; border:1px solid #000; text-align:center; font-size:8.5px; height:14px;`;
  const tdDay = `padding:0px 1px; border:1px solid #000; text-align:center; font-size:7.5px; height:14px; line-height:1;`;

  // colgroup — fix widths so NIS & NAMA fit text and date columns stay compact
  let colgroup = `<colgroup>
    <col style="width:22px;">
    <col style="width:60px;">
    <col style="width:150px;">
    <col style="width:22px;">`;
  for (let i = 0; i < lastDay; i++) colgroup += `<col style="width:20px;">`;
  colgroup += `<col style="width:22px;"><col style="width:22px;"><col style="width:22px;"><col style="width:22px;">`;
  colgroup += `<col style="width:52px;"></colgroup>`;

  // Header row 1
  let head = `<tr>
    <th style="${thWide}" rowspan="3">NO</th>
    <th style="${thWide}" rowspan="3">NIS</th>
    <th style="${thWide}" rowspan="3">NAMA SISWA</th>
    <th style="${thWide}" rowspan="3">L/P</th>
    <th style="${thWide}" colspan="${lastDay}">TANGGAL / BULAN ${BULAN_ID[month - 1].toUpperCase()}</th>
    <th style="${thWide}" colspan="4">JUMLAH</th>
    <th style="${thWide}" rowspan="3">KET</th>
  </tr>`;

  // Header row 2 (hari letter)
  head += `<tr>`;
  for (const day of days) {
    const bg = day.isWeekend || day.isLibur ? COLOR_WEEKEND_BG : "#fff";
    const color = day.isWeekend || day.isLibur ? COLOR_HEADER_RED : "#000";
    head += `<th style="${th} background:${bg}; color:${color};">${HARI_LETTER[day.dow]}</th>`;
  }
  head += `<th style="${thWide}" rowspan="2">H</th><th style="${thWide}" rowspan="2">S</th><th style="${thWide}" rowspan="2">I</th><th style="${thWide}" rowspan="2">A</th>`;
  head += `</tr>`;

  // Header row 3 (date number)
  head += `<tr>`;
  for (const day of days) {
    const bg = day.isWeekend || day.isLibur ? COLOR_WEEKEND_BG : "#fff";
    const color = day.isWeekend || day.isLibur ? COLOR_HEADER_RED : "#000";
    head += `<th style="${th} background:${bg}; color:${color};">${day.d}</th>`;
  }
  head += `</tr>`;

  // Body
  let body = "";
  r.students.forEach((s, idx) => {
    let h = 0, sc = 0, i = 0, a = 0;
    let cells = "";
    for (const day of days) {
      let bg = "#fff";
      let text = "";
      let color = "#000";
      const status = kosong ? undefined : r.attendance[s.id]?.[day.iso];
      if (day.isLibur) {
        bg = COLOR_LIBUR_BG;
        text = kosong ? "L" : "L";
        color = COLOR_LIBUR_TEXT;
      } else if (day.isWeekend) {
        bg = COLOR_WEEKEND_BG;
        text = "";
      } else if (status) {
        if (status === "H") { text = STATUS_DOT; h++; }
        else if (status === "S") { text = "S"; color = "#B8860B"; sc++; }
        else if (status === "I") { text = "I"; color = "#0369A1"; i++; }
        else if (status === "A") { text = "A"; color = "#B91C1C"; a++; }
        else if (status === "P") { text = "P"; color = "#7C3AED"; }
      } else {
        // Weekday, no attendance recorded → pink empty
        bg = COLOR_EMPTY_BG;
        text = "";
      }
      cells += `<td style="${tdDay} background:${bg}; color:${color};">${text}</td>`;
    }
    body += `<tr>
      <td style="${td}">${idx + 1}</td>
      <td style="${td} white-space:nowrap; font-size:8px;">${escapeHtml(s.nis ?? "")}</td>
      <td style="${td} text-align:left; padding-left:4px; white-space:normal; word-break:break-word; line-height:1.15;">${escapeHtml(s.name)}</td>
      <td style="${td}">${escapeHtml((s.gender ?? "").toString().toUpperCase().startsWith("P") ? "P" : (s.gender ? "L" : ""))}</td>
      ${cells}
      <td style="${td}">${kosong ? "" : h || ""}</td>
      <td style="${td}">${kosong ? "" : sc || ""}</td>
      <td style="${td}">${kosong ? "" : i || ""}</td>
      <td style="${td}">${kosong ? "" : a || ""}</td>
      <td style="${td}"></td>
    </tr>`;
  });

  return `
  <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-family:Arial,Helvetica,sans-serif;">
    ${colgroup}
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table>
  `;
}

function footerHtml(r: DaftarHadirRombelData, month: number, year: number, overrideName?: string | null, overrideNip?: string | null): string {
  const laki = r.students.filter((s) => String(s.gender || "").toUpperCase().startsWith("L")).length;
  const perempuan = r.students.filter((s) => String(s.gender || "").toUpperCase().startsWith("P")).length;
  const jumlah = r.students.length;
  const bulan = BULAN_ID[month - 1];
  const wali = overrideName ?? r.rombel.wali_kelas_name ?? "";
  const nip = overrideNip ?? r.rombel.wali_kelas_nip ?? "";

  return `
  <table style="width:100%; border-collapse:collapse; margin-top:10px; font-family:Arial,Helvetica,sans-serif; font-size:11px;">
    <tr>
      <td style="width:30%; vertical-align:top;">
        <table style="border-collapse:collapse; font-size:10px; margin-bottom:6px;">
          <tr><td colspan="2" style="border:1px solid #000; padding:2px 6px; text-align:center; font-weight:bold;">Keterangan</td></tr>
          <tr><td style="border:1px solid #000; padding:1px 6px; width:22px; text-align:center;">H</td><td style="border:1px solid #000; padding:1px 8px;">Hadir</td></tr>
          <tr><td style="border:1px solid #000; padding:1px 6px; text-align:center;">S</td><td style="border:1px solid #000; padding:1px 8px;">Sakit</td></tr>
          <tr><td style="border:1px solid #000; padding:1px 6px; text-align:center;">I</td><td style="border:1px solid #000; padding:1px 8px;">Izin</td></tr>
          <tr><td style="border:1px solid #000; padding:1px 6px; text-align:center;">A</td><td style="border:1px solid #000; padding:1px 8px;">Alpa</td></tr>
        </table>
        <div style="color:#1e3a8a; font-weight:bold; font-size:11px;">
          <div>Laki-Laki&nbsp;&nbsp;&nbsp;&nbsp;: ${laki} Orang</div>
          <div>Perempuan&nbsp;&nbsp;: ${perempuan} Orang</div>
          <div>Jumlah&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${jumlah} Orang</div>
        </div>
      </td>
      <td style="width:35%; vertical-align:top; text-align:center;">
        <div>Mengetahui,</div>
        <div>Kepala SMKN 1 Pusakanagara</div>
        <div style="height:56px;"></div>
        <div style="font-weight:bold;">Abdul Rosid, S.T</div>
        <div>NIP. 198111222009021003</div>
      </td>
      <td style="width:35%; vertical-align:top; text-align:center;">
        <div>Subang, &nbsp;&nbsp;&nbsp; ${bulan} ${year}</div>
        <div>Wali Kelas,</div>
        <div style="height:56px;"></div>
        <div style="font-weight:bold;">${escapeHtml(wali)}</div>
        <div>${nip ? `NIP. ${escapeHtml(nip)}` : ""}</div>
      </td>
    </tr>
  </table>
  <div style="text-align:center; margin-top:14px; font-style:italic; font-size:10px; color:#374151;">
    Laporan ini diekspor melalui : Aplikasi Students Presence Module SMKN 1 Pusakanagara
  </div>
  `;
}

function chunkStudents<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out || [[]];
}

export async function exportDaftarHadirPdf(data: DaftarHadirData, opts: PdfOptions = {}): Promise<void> {
  const logoJabar = await loadLogoDataUrl();
  const logoSekolah = await schoolLogoDataUrl();
  const liburSet = new Set(data.liburDates);
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
  let first = true;

  const PER_PAGE = 19; // students per page based on sample

  for (const r of data.rombels) {
    const chunks = chunkStudents(r.students, PER_PAGE);
    if (chunks.length === 0) chunks.push([]);
    for (let ci = 0; ci < chunks.length; ci++) {
      const isLast = ci === chunks.length - 1;
      const pageRombel: DaftarHadirRombelData = { ...r, students: chunks[ci] };
      const html = `
        ${ci === 0 ? kopHtml(logoJabar, logoSekolah) + titleHtml(data.tahun_ajaran, `${r.rombel.name}`) : `
          <div style="font-size:11px; margin:4px 0 6px 4px;">Daftar Hadir Murid - <b>${escapeHtml(r.rombel.name)}</b> - ${BULAN_ID[data.month - 1]} ${data.year}</div>
        `}
        ${buildAttendanceTable(pageRombel, data.month, data.year, liburSet, !!opts.kosong)}
        ${isLast ? footerHtml(r, data.month, data.year, opts.overrideWaliName, opts.overrideWaliNip) : ""}
      `;
      await addHtmlPageToPdf(pdf, html, "landscape", first);
      first = false;
    }
  }

  const suffix = opts.kosong ? "Kosong" : "REKAP";
  const rname = data.rombels.length === 1 ? data.rombels[0].rombel.name.replace(/\s+/g, "-") : `${data.rombels.length}Rombel`;
  const stamp = new Date();
  const hh = pad2(stamp.getHours()), mi = pad2(stamp.getMinutes());
  const dd = pad2(stamp.getDate()), mm = pad2(stamp.getMonth() + 1), yy = stamp.getFullYear();
  pdf.save(`Rekap-Bulanan-${suffix}-${rname}-${BULAN_ID[data.month - 1]}-${data.year}_${hh}_${mi}-${dd}_${mm}_${yy}.pdf`);
}
