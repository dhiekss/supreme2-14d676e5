import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getKbmInputStatus } from "@/lib/lapor-kbm.functions";
import { todayWIB } from "@/lib/wib";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";

export const kbmInputStatusQO = (tanggal: string) => queryOptions({
  queryKey: ["kbm-input-status", tanggal],
  queryFn: () => getKbmInputStatus({ data: { tanggal } }),
});

function Periods({ periods, filled }: { periods: number[]; filled: boolean }) {
  return <div className="flex flex-wrap gap-1">
    {periods.length === 0 ? <span className="text-muted-foreground">—</span> : periods.map((jam) => (
      <span key={jam} title={`Jam ${jam}: ${filled ? "sudah" : "belum"} diinput`}
        aria-label={`Jam ${jam}: ${filled ? "sudah" : "belum"} diinput`}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${filled ? "bg-input-complete text-input-complete-foreground" : "bg-input-missing text-input-missing-foreground"}`}>
        {jam}
      </span>
    ))}
  </div>;
}

export function KbmInputStatus() {
  const [tanggal, setTanggal] = useState(todayWIB);
  const [pageSize, setPageSize] = useState("10");
  const [page, setPage] = useState(0);
  const { data: rows } = useSuspenseQuery(kbmInputStatusQO(tanggal));
  const size = pageSize === "all" ? Math.max(rows.length, 1) : Number(pageSize);
  const lastPage = Math.max(0, Math.ceil(rows.length / size) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = rows.slice(currentPage * size, (currentPage + 1) * size);
  return <section className="space-y-4 border-y py-5" aria-label="Detail jam input KBM">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold"><CircleAlert className="h-5 w-5 text-input-missing" />Detail Jam Input KBM per Rombel</h2>
      <div className="flex items-center gap-2">
        <label htmlFor="kbm-input-date" className="text-sm">Tanggal</label>
        <Input id="kbm-input-date" className="w-44" type="date" value={tanggal} onChange={(e) => {
          if (e.target.value) { setTanggal(e.target.value); setPage(0); }
        }} />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Menampilkan {visible.length} dari {rows.length} rombel</span>
      <div className="flex items-center gap-2"><span>Tampilkan</span>
        <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(0); }}>
          <SelectTrigger aria-label="Jumlah rombel per halaman" className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{["10", "20", "100", "all"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "Semua" : value}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <Table>
      <TableHeader><TableRow>
        <TableHead className="w-12">No</TableHead><TableHead>Rombel</TableHead>
        <TableHead>Jam Sudah Diinput</TableHead><TableHead>Jam Belum Diinput</TableHead>
        <TableHead className="text-right">Jumlah Kosong</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {visible.map((row, index) => <TableRow key={row.id}>
          <TableCell>{currentPage * size + index + 1}</TableCell><TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
          <TableCell className="min-w-40"><Periods periods={row.filled} filled /></TableCell>
          <TableCell className="min-w-64"><Periods periods={row.missing} filled={false} /></TableCell>
          <TableCell className="text-right font-semibold">{row.missingCount}</TableCell>
        </TableRow>)}
        {rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Tidak ada rombel yang dapat ditampilkan.</TableCell></TableRow>}
      </TableBody>
    </Table>
    {lastPage > 0 && <div className="flex items-center justify-end gap-3 text-sm">
      <Button variant="outline" size="icon" aria-label="Halaman rombel sebelumnya" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button>
      <span>{currentPage + 1} / {lastPage + 1}</span>
      <Button variant="outline" size="icon" aria-label="Halaman rombel berikutnya" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button>
    </div>}
  </section>;
}