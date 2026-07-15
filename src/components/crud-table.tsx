import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  sort?: (a: T, b: T) => number;
};

export function CrudTable<T extends { id: string }>(props: {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  search?: (row: T, q: string) => boolean;
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void | Promise<unknown>;
  addLabel?: string;
  extra?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [confirmRow, setConfirmRow] = useState<T | null>(null);
  const filtered = props.search && q ? props.rows.filter((r) => props.search!(r, q.toLowerCase())) : props.rows;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{props.title}</h1>
          {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {props.extra}
          <Button onClick={props.onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {props.addLabel ?? "Tambah"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {props.search && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {props.columns.map((c, i) => (
                    <TableHead key={i} className={c.className}>{c.header}</TableHead>
                  ))}
                  <TableHead className="w-[120px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={props.columns.length + 1} className="text-center text-muted-foreground py-8">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      {props.columns.map((c, i) => (
                        <TableCell key={i} className={c.className}>{c.cell(row)}</TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => props.onEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmRow(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmRow) await props.onDelete(confirmRow);
                setConfirmRow(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
