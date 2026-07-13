import { jsPDF } from "jspdf";
import {
  addHtmlPageToPdf,
  escapeHtml,
  fmtTanggalId,
  daysBetween,
  loadLogoDataUrl,
  INSTANSI,
  KOTA,
  KPA_NAMA,
  KPA_NIP,
  KPA_PANGKAT,
} from "./pdf-html-common";

export type SppdPeserta = {
  nama_peserta?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  urutan?: number | null;
  is_utama?: boolean | null;
};

export type SppdPdfData = {
  nomor_surat?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tujuan_lokasi?: string | null;
  keperluan?: string | null;
  kendaraan?: string | null;
  kode_kegiatan?: string | null;
  kode_ring?: string | null;
  peserta?: SppdPeserta[];
};

// Landscape A4 target: 1123 x 794 px
export function buildSppdHtml(row: SppdPdfData, logo: string): string {
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const pelaksana = peserta[0];
  const pengikut = peserta.slice(1);
  const slots = Math.max(2, pengikut.length);
  const pengikutRows = Array.from({ length: slots }).map((_, i) => {
    const p = pengikut[i];
    return `
      <tr>
        <td style="${tdBase}"></td>
        <td style="${tdBase}">${i + 1}. ${escapeHtml(p?.nama_peserta)}</td>
        <td style="${tdBase}">${escapeHtml(p?.nip)}</td>
        <td style="${tdBase}">${escapeHtml(p?.jabatan)}</td>
      </tr>
    `;
  }).join("");

  const kv = (label: string, value: string) =>
    `<div style="display:flex; margin-bottom:2px;">
      <div style="width:110px; flex-shrink:0;">${label}</div>
      <div style="width:8px; flex-shrink:0;">:</div>
      <div style="flex:1;">${value}</div>
    </div>`;

  return `
  <div style="width:1123px; height:794px; padding:10px 16px; box-sizing:border-box; font-family:Arial,Helvetica,sans-serif; font-size:10.5px; color:#000; line-height:1.25;">
    <table style="width:100%; height:100%; border-collapse:collapse;">
      <tr>
        <!-- LEFT -->
        <td style="width:50%; vertical-align:top; padding-right:10px; border-right:1px solid #000;">
          <!-- KOP -->
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="width:90px; vertical-align:middle; text-align:center;">
                <img src="${logo}" style="width:80px; height:auto;" />
              </td>
              <td style="text-align:center; vertical-align:middle; line-height:1.35;">
                <div style="font-size:12px;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</div>
                <div style="font-size:12px;">DINAS PENDIDIKAN</div>
                <div style="font-size:12px;">CABANG DINAS PENDIDIKAN WILAYAH IV</div>
                <div style="font-size:16px; font-weight:bold; margin-top:1px;">SMK NEGERI 1 PUSAKANAGARA</div>
                <div style="font-size:10px;">Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240</div>
                <div style="font-size:10px;">Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com</div>
                <div style="font-size:10px;">SUBANG - 41255</div>
              </td>
            </tr>
          </table>
          <div style="border-top:3px solid #000; border-bottom:1px solid #000; height:3px; margin-top:2px; margin-bottom:10px;"></div>

          <!-- Info block -->
          <table style="border-collapse:collapse; margin-left:120px; font-size:11px;">
            <tr><td style="width:110px; padding:1px 0;">Lembar Ke</td><td style="width:10px;">:</td><td>2 (dua)</td></tr>
            <tr><td style="padding:1px 0;">Kode Rekening</td><td>:</td><td>${escapeHtml(row.kode_ring)}</td></tr>
            <tr><td style="padding:1px 0;">Kode Kegiatan</td><td>:</td><td>${escapeHtml(row.kode_kegiatan)}</td></tr>
            <tr><td style="padding:1px 0;">Nomor</td><td>:</td><td>${escapeHtml(row.nomor_surat)}</td></tr>
          </table>

          <div style="text-align:center; margin:10px 0 6px 0;">
            <span style="font-weight:bold; text-decoration:underline; font-size:12px;">SURAT PERINTAH PERJALANAN DINAS (SPPD)</span>
          </div>

          <!-- MAIN TABLE -->
          <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
            <colgroup>
              <col style="width:22px;" />
              <col style="width:190px;" />
              <col />
            </colgroup>
            <tr>
              <td style="${tdBase}; text-align:center;">1</td>
              <td style="${tdBase}">Pengguna Anggaran / Kuasa Pengguna Anggaran</td>
              <td style="${tdBase}">${KPA_NAMA}<br/>NIP. ${KPA_NIP}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">2</td>
              <td style="${tdBase}">Nama/NIP Pegawai yang melaksanakan Perjalanan Dinas</td>
              <td style="${tdBase}">${escapeHtml(pelaksana?.nama_peserta)}${pelaksana?.nip ? `<br/>NIP. ${escapeHtml(pelaksana.nip)}` : ""}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">3</td>
              <td style="${tdBase}">a.&nbsp;&nbsp;Pangkat dan Golongan</td>
              <td style="${tdBase}">${escapeHtml(pelaksana?.pangkat_golongan)}</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">b.&nbsp;&nbsp;Jabatan/Instansi</td>
              <td style="${tdBase}">${escapeHtml(pelaksana?.jabatan)}${pelaksana?.jabatan ? " / " : ""}${INSTANSI}</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">c.&nbsp;&nbsp;Tingkat Biaya Perjalanan Dinas</td>
              <td style="${tdBase}">&nbsp;</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">4</td>
              <td style="${tdBase}">Maksud Perjalanan Dinas</td>
              <td style="${tdBase}">${escapeHtml(row.keperluan)}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">5</td>
              <td style="${tdBase}">Alat angkutan yang dipergunakan</td>
              <td style="${tdBase}">${escapeHtml(row.kendaraan ?? "Roda 4")}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">6</td>
              <td style="${tdBase}">a.&nbsp;&nbsp;Tempat berangkat</td>
              <td style="${tdBase}">${INSTANSI}</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">b.&nbsp;&nbsp;Tempat tujuan</td>
              <td style="${tdBase}">${escapeHtml(row.tujuan_lokasi)}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">7</td>
              <td style="${tdBase}">a.&nbsp;&nbsp;Lamanya Perjalanan Dinas</td>
              <td style="${tdBase}">${daysBetween(row.tanggal_mulai, row.tanggal_selesai)} (hari)</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">b.&nbsp;&nbsp;Tanggal berangkat</td>
              <td style="${tdBase}">${fmtTanggalId(row.tanggal_mulai)}</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">c.&nbsp;&nbsp;Tanggal harus kembali/tiba di tempat baru</td>
              <td style="${tdBase}">${fmtTanggalId(row.tanggal_selesai)}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">8</td>
              <td style="${tdBase}">Pengikut : Nama</td>
              <td style="${tdBase}; padding:0;">
                <table style="width:100%; border-collapse:collapse;">
                  <tr>
                    <td style="width:50%; border-right:1px solid #000; padding:2px 5px;">NIP/Tanggal Lahir</td>
                    <td style="padding:3px 4px;">Keterangan</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${pengikutRows}
            <tr>
              <td style="${tdBase}; text-align:center;">9</td>
              <td style="${tdBase}">Pembebanan Anggaran</td>
              <td style="${tdBase}">&nbsp;</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">a.&nbsp;&nbsp;Instansi</td>
              <td style="${tdBase}">${INSTANSI}</td>
            </tr>
            <tr>
              <td style="${tdBase}"></td>
              <td style="${tdBase}">b.&nbsp;&nbsp;Akun</td>
              <td style="${tdBase}">${escapeHtml(row.kode_ring)}</td>
            </tr>
            <tr>
              <td style="${tdBase}; text-align:center;">10</td>
              <td style="${tdBase}">Keterangan lain-lain</td>
              <td style="${tdBase}">&nbsp;</td>
            </tr>
          </table>

          <!-- TTD LEFT -->
          <div style="margin-top:14px; margin-left:52%;">
            <div>Dikeluarkan di&nbsp;&nbsp;: ${KOTA}</div>
            <div>Tanggal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${fmtTanggalId(row.tanggal_mulai)}</div>
            <div>Kuasa Pengguna Anggaran</div>
            <div style="height:26px;"></div>
            <div style="font-weight:bold; text-decoration:underline;">${KPA_NAMA}</div>
            <div>${KPA_PANGKAT}</div>
            <div>NIP. ${KPA_NIP}</div>
          </div>
        </td>

        <!-- RIGHT -->
        <td style="width:50%; vertical-align:top; padding-left:10px;">
          <table style="border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <tr><td style="width:80px; padding:1px 0;">Lampiran</td><td style="width:8px;">:</td><td>Surat Perjalanan Dinas</td></tr>
            <tr><td style="padding:1px 0;">Nomor</td><td>:</td><td>${escapeHtml(row.nomor_surat)}</td></tr>
            <tr><td style="padding:1px 0;">Tanggal</td><td>:</td><td>${fmtTanggalId(row.tanggal_mulai)}</td></tr>
          </table>

          <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
            <colgroup>
              <col style="width:50%;" />
              <col style="width:50%;" />
            </colgroup>
            <!-- Row 0: kiri kosong, kanan Berangkat awal + TTD -->
            <tr>
              <td style="${tdBase}; height:110px; vertical-align:top;">&nbsp;</td>
              <td style="${tdBase}; vertical-align:top;">
                ${kv("Berangkat dari", INSTANSI)}
                ${kv("Ke", escapeHtml(row.tujuan_lokasi ?? ""))}
                ${kv("Pada Tanggal", fmtTanggalId(row.tanggal_mulai))}
                <div style="height:26px;"></div>
                <div style="font-weight:bold;">${KPA_NAMA}</div>
                <div>${KPA_PANGKAT}</div>
                <div>NIP. ${KPA_NIP}</div>
              </td>
            </tr>
            ${["I", "II", "III"].map((r) => `
              <tr>
                <td style="${tdBase}; height:66px; vertical-align:top;">
                  ${kv(`${r}. Tiba di`, "")}
                  ${kv("Pada Tanggal", "")}
                  ${kv("Kepala", "")}
                </td>
                <td style="${tdBase}; vertical-align:top;">
                  ${kv("Berangkat dari", "")}
                  ${kv("Ke", "")}
                  ${kv("Pada Tanggal", "")}
                  ${kv("Kepala", "")}
                </td>
              </tr>
            `).join("")}
            <tr>
              <td style="${tdBase}; vertical-align:top; height:110px;">
                <div>IV. Tiba kembali di :</div>
                <div>${INSTANSI}</div>
                <div>Pada Tanggal : ${fmtTanggalId(row.tanggal_selesai)}</div>
                <div style="height:26px;"></div>
                <div style="font-weight:bold;">${KPA_NAMA}</div>
                <div>${KPA_PANGKAT}</div>
                <div>NIP. ${KPA_NIP}</div>
              </td>
              <td style="${tdBase}; vertical-align:top;">
                <div style="font-size:10px; line-height:1.35;">
                  Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya
                  dan semata-mata untuk kepentingan jabatan dalam waktu sesingkat-singkatnya
                </div>
                <div style="margin-top:6px;">Kuasa Pengguna Anggaran</div>
                <div style="height:26px;"></div>
                <div style="font-weight:bold;">${KPA_NAMA}</div>
                <div>${KPA_PANGKAT}</div>
                <div>NIP. ${KPA_NIP}</div>
              </td>
            </tr>
          </table>

          <div style="margin-top:8px; font-weight:bold;">V. PERHATIAN</div>
          <div style="font-size:9.5px; line-height:1.35; text-align:justify;">
            PA/KPA yang telah menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya.
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;
}

const tdBase = "border:1px solid #000; padding:2px 5px; vertical-align:top;";

export function sppdPdfFilename(row: SppdPdfData, prefix = "SPPD"): string {
  const nomor = (row.nomor_surat ?? "").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const d = row.tanggal_mulai ? new Date(row.tanggal_mulai) : null;
  const tgl = d && !isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  const parts = [prefix, nomor || "tanpa-nomor", tgl].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

export async function downloadSppdPdf(row: SppdPdfData) {
  const logo = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  await addHtmlPageToPdf(pdf, buildSppdHtml(row, logo), "landscape", true);
  pdf.save(sppdPdfFilename(row));
}
