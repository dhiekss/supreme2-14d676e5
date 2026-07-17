import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { listBooks, upsertBook, deleteBook, listLoans, createLoan, returnLoan, deleteLoan } from "@/lib/perpus.functions";
import { Plus, Trash2, Pencil, BookOpen, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perpus")({
  head: () => ({ meta: [{ title: "Perpustakaan — SUPREME XPOES" }] }),
  component: PerpusPage,
});

function PerpusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perpustakaan</h1>
        <p className="text-sm text-muted-foreground">Kelola koleksi buku dan peminjaman.</p>
      </div>
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Koleksi Buku</TabsTrigger>
          <TabsTrigger value="loans">Peminjaman</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-4"><BooksTab /></TabsContent>
        <TabsContent value="loans" className="mt-4"><LoansTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function BooksTab() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const fetchFn = useServerFn(listBooks);
  const delFn = useServerFn(deleteBook);

  const { data } = useSuspenseQuery({
    queryKey: ["books", search],
    queryFn: () => fetchFn({ data: { search: search || undefined } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Buku dihapus"); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[240px] space-y-1">
          <Label>Cari</Label>
          <Input placeholder="Judul, penulis, ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <BookFormDialog onSaved={() => qc.invalidateQueries({ queryKey: ["books"] })} />
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Judul</th>
                <th className="text-left p-3">Penulis</th>
                <th className="text-left p-3">Jenis</th>
                <th className="text-left p-3">ISBN</th>
                <th className="text-left p-3">Tahun</th>
                <th className="text-right p-3">Stok</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3 font-medium">{b.judul}</td>
                  <td className="p-3">{b.penulis ?? "—"}</td>
                  <td className="p-3">{b.jenis_buku ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{b.isbn ?? "—"}</td>
                  <td className="p-3">{b.tahun_pengadaan ?? "—"}</td>
                  <td className="p-3 text-right">{b.jumlah_tersedia ?? 0}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <BookFormDialog book={b} onSaved={() => qc.invalidateQueries({ queryKey: ["books"] })} />
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus buku?")) del.mutate(b.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Belum ada buku.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function BookFormDialog({ book, onSaved }: { book?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    judul: book?.judul ?? "",
    penulis: book?.penulis ?? "",
    jenisBuku: book?.jenis_buku ?? "",
    isbn: book?.isbn ?? "",
    tahunPengadaan: book?.tahun_pengadaan ?? new Date().getFullYear(),
    jumlahTersedia: book?.jumlah_tersedia ?? 1,
  });
  const fn = useServerFn(upsertBook);
  const save = useMutation({
    mutationFn: () => fn({ data: { id: book?.id, ...form, tahunPengadaan: Number(form.tahunPengadaan), jumlahTersedia: Number(form.jumlahTersedia) } }),
    onSuccess: () => { toast.success("Tersimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {book ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-1" /> Tambah Buku</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{book ? "Edit Buku" : "Tambah Buku"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Judul</Label><Input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
          <div className="space-y-1"><Label>Penulis</Label><Input value={form.penulis} onChange={(e) => setForm({ ...form, penulis: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Jenis</Label><Input value={form.jenisBuku} onChange={(e) => setForm({ ...form, jenisBuku: e.target.value })} /></div>
            <div className="space-y-1"><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tahun</Label><Input type="number" value={form.tahunPengadaan} onChange={(e) => setForm({ ...form, tahunPengadaan: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Stok</Label><Input type="number" value={form.jumlahTersedia} onChange={(e) => setForm({ ...form, jumlahTersedia: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => { if (!form.judul) return toast.error("Judul wajib"); save.mutate(); }} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoansTab() {
  const [status, setStatus] = useState("all");
  const qc = useQueryClient();
  const fetchFn = useServerFn(listLoans);
  const returnFn = useServerFn(returnLoan);
  const delFn = useServerFn(deleteLoan);

  const { data } = useSuspenseQuery({
    queryKey: ["loans", status],
    queryFn: () => fetchFn({ data: { status } }),
  });

  const ret = useMutation({
    mutationFn: (id: string) => returnFn({ data: { id } }),
    onSuccess: () => { toast.success("Buku dikembalikan"); qc.invalidateQueries({ queryKey: ["loans"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Pinjaman dihapus"); qc.invalidateQueries({ queryKey: ["loans"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="dipinjam">Sedang Dipinjam</SelectItem>
              <SelectItem value="kembali">Sudah Kembali</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <LoanFormDialog onSaved={() => qc.invalidateQueries({ queryKey: ["loans"] })} />
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Peminjam</th>
                <th className="text-left p-3">Buku</th>
                <th className="text-left p-3">Tgl Pinjam</th>
                <th className="text-left p-3">Tgl Kembali</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l: any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{l.borrower_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{l.borrower_type} {l.rombel_name !== "—" && `· ${l.rombel_name}`}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {l.book_titles.map((t: string, i: number) => <div key={i}>• {t}</div>)}
                  </td>
                  <td className="p-3">{l.tanggal_peminjaman}</td>
                  <td className="p-3">{l.tanggal_pengembalian ?? "—"}</td>
                  <td className="p-3">
                    {l.status === "kembali"
                      ? <Badge className="bg-green-600">Kembali</Badge>
                      : <Badge variant="secondary">Dipinjam</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {l.status !== "kembali" && (
                        <Button variant="outline" size="sm" onClick={() => ret.mutate(l.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Kembalikan
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus pinjaman?")) del.mutate(l.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada peminjaman.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function LoanFormDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    borrowerType: "siswa" as "siswa" | "guru" | "umum",
    borrowerName: "",
    bookIds: [] as string[],
    tanggalPeminjaman: new Date().toISOString().slice(0, 10),
  });
  const fetchBooks = useServerFn(listBooks);
  const createFn = useServerFn(createLoan);

  const { data: books = [] } = useSuspenseQuery({
    queryKey: ["books-picker", search],
    queryFn: () => fetchBooks({ data: { search: search || undefined } }),
  });

  const save = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => { toast.success("Pinjaman dicatat"); setOpen(false); setForm({ ...form, borrowerName: "", bookIds: [] }); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleBook = (id: string) => {
    setForm((f) => ({ ...f, bookIds: f.bookIds.includes(id) ? f.bookIds.filter((x) => x !== id) : [...f.bookIds, id] }));
  };

  const submit = () => {
    if (!form.borrowerName) return toast.error("Nama peminjam wajib");
    if (form.bookIds.length === 0) return toast.error("Pilih minimal 1 buku");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><BookOpen className="h-4 w-4 mr-1" /> Pinjam Buku</Button></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Pinjam Buku</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipe Peminjam</Label>
              <Select value={form.borrowerType} onValueChange={(v) => setForm({ ...form, borrowerType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="siswa">Murid</SelectItem>
                  <SelectItem value="guru">Guru</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tanggal Pinjam</Label>
              <Input type="date" value={form.tanggalPeminjaman} onChange={(e) => setForm({ ...form, tanggalPeminjaman: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nama Peminjam</Label>
            <Input value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Cari & pilih buku</Label>
            <Input placeholder="Cari judul..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="border rounded max-h-56 overflow-y-auto divide-y">
              {books.slice(0, 50).map((b: any) => (
                <label key={b.id} className="flex items-center gap-2 p-2 text-sm hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={form.bookIds.includes(b.id)} onCheckedChange={() => toggleBook(b.id)} />
                  <div className="flex-1">
                    <div>{b.judul}</div>
                    <div className="text-xs text-muted-foreground">{b.penulis ?? "—"} · Stok: {b.jumlah_tersedia ?? 0}</div>
                  </div>
                </label>
              ))}
              {books.length === 0 && <div className="p-3 text-xs text-muted-foreground text-center">Tidak ada buku.</div>}
            </div>
            <div className="text-xs text-muted-foreground">{form.bookIds.length} buku dipilih</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
