import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getKbmInputStatus } from "@/lib/lapor-kbm.functions";
import { todayWIB } from "@/lib/wib";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";

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
  const [tingkat, setTingkat] = useState("all");
  const [sort, setSort] = useState<{ key: "name" | "filled" | "missing" | "missingCount"; ascending: boolean }>({ key: "name", ascending: true });
  const { data: rows } = useSuspenseQuery(kbmInputStatusQO(tanggal));
  const tingkatOptions = useMemo(() => [...new Set(rows.map((row) => row.tingkat).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, "id", { numeric: true })), [rows]);
  const filtered = useMemo(() => rows.filter((row) => tingkat === "all" || row.tingkat === tingkat).sort((a, b) => {
    const nameCompare = (a.name ?? "").localeCompare(b.name ?? "", "id", { numeric: true });
    const compare = sort.key === "name" ? nameCompare : sort.key === "missingCount" ? a.missingCount - b.missingCount : a[sort.key].length - b[sort.key].length;
    return (sort.ascending ? compare : -compare) || nameCompare;
  }), [rows, tingkat, sort]);
  const sortHeader = (key: typeof sort.key, label: string) => {
    const active = sort.key === key;
    const Icon = active ? sort.ascending ? ArrowUp : ArrowDown : ArrowUpDown;
    return <TableHead aria-sort={active ? sort.ascending ? "ascending" : "descending" : "none"} className={key === "missingCount" ? "text-right" : ""}>
      <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => { setSort({ key, ascending: active ? !sort.ascending : true }); setPage(0); }}>
        {label}<Icon className="ml-1 h-3.5 w-3.5" />
      </Button>
    </TableHead>;
  };
  const size = pageSize === "all" ? Math.max(filtered.length, 1) : Number(pageSize);
  const lastPage = Math.max(0, Math.ceil(filtered.length / size) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * size, (currentPage + 1) * size);
  return <section className="space-y-4 border-y py-5" aria-label="Detail jam input KBM">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold"><CircleAlert className="h-5 w-5 text-input-missing" />Detail Jam Input KBM per Rombel</h2>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="kbm-input-tingkat" className="text-sm">Tingkat</label>
        <Select value={tingkat} onValueChange={(value) => { setTingkat(value); setPage(0); }}>
          <SelectTrigger id="kbm-input-tingkat" aria-label="Filter tingkat KBM" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Tingkat</SelectItem>{tingkatOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
        <label htmlFor="kbm-input-date" className="text-sm">Tanggal</label>
        <Input id="kbm-input-date" className="w-44" type="date" value={tanggal} onChange={(e) => {
          if (e.target.value) { setTanggal(e.target.value); setPage(0); }
        }} />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Menampilkan {visible.length} dari {filtered.length} rombel</span>
      <div className="flex items-center gap-2"><span>Tampilkan</span>
        <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(0); }}>
          <SelectTrigger aria-label="Jumlah rombel per halaman" className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{["10", "20", "100", "all"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "Semua" : value}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <Table>
      <TableHeader><TableRow>
        <TableHead className="w-12">No</TableHead>{sortHeader("name", "Rombel")}
        {sortHeader("filled", "Jam Sudah Diinput")}{sortHeader("missing", "Jam Belum Diinput")}
        {sortHeader("missingCount", "Jumlah Kosong")}
      </TableRow></TableHeader>
      <TableBody>
        {visible.map((row, index) => <TableRow key={row.id}>
          <TableCell>{currentPage * size + index + 1}</TableCell><TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
          <TableCell className="min-w-40"><Periods periods={row.filled} filled /></TableCell>
          <TableCell className="min-w-64"><Periods periods={row.missing} filled={false} /></TableCell>
          <TableCell className="text-right font-semibold">{row.missingCount}</TableCell>
        </TableRow>)}
        {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Tidak ada rombel yang dapat ditampilkan.</TableCell></TableRow>}
      </TableBody>
    </Table>
    {lastPage > 0 && <div className="flex items-center justify-end gap-3 text-sm">
      <Button variant="outline" size="icon" aria-label="Halaman rombel sebelumnya" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button>
      <span>{currentPage + 1} / {lastPage + 1}</span>
      <Button variant="outline" size="icon" aria-label="Halaman rombel berikutnya" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button>
    </div>}
  </section>;
}