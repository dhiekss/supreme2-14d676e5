import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function pagedIn(s: any, table: string, select: string, column: string, ids: string[], extra?: (q: any) => any) {
  const rows: any[] = [];
  for (const part of chunk(ids, 100)) {
    let from = 0;
    for (;;) {
      let q = s.from(table).select(select).in(column, part).range(from, from + 999);
      if (extra) q = extra(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
  }
  return rows;
}

export const getDashboardNilai = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const userId = context.userId;

    const { data: semester } = await s
      .from("semester")
      .select("id, nama, tahun_ajaran_id")
      .eq("is_active", true)
      .maybeSingle();
    if (!semester) {
      return { semester: null, scoped: false, assignments: [], studentScores: [] };
    }

    const [{ data: isAdmin }, { data: isSuper }, { data: isWakasek }, { data: isKakonli }, { data: profile }] =
      await Promise.all([
        s.rpc("has_role", { _user_id: userId, _role: "admin" }),
        s.rpc("has_role", { _user_id: userId, _role: "superadmin" }),
        s.rpc("has_role", { _user_id: userId, _role: "wakasek" }),
        s.rpc("has_role", { _user_id: userId, _role: "kakonli" }),
        s.from("profiles").select("nip").eq("id", userId).maybeSingle(),
      ]);
    const privileged = Boolean(isAdmin || isSuper || isWakasek || isKakonli);

    let guruIds: string[] | null = null;
    if (!privileged) {
      const nip = (profile as any)?.nip;
      if (!nip) return { semester, scoped: true, assignments: [], studentScores: [] };
      const { data: gurus } = await s.from("guru").select("id").eq("nip", nip);
      guruIds = (gurus ?? []).map((g: any) => g.id);
      if (!guruIds.length) return { semester, scoped: true, assignments: [], studentScores: [] };
    }

    let aq = s
      .from("rombel_mata_pelajaran")
      .select("id, rombel_id, mata_pelajaran_id, guru_id")
      .is("deleted_at", null)
      .or(`semester_id.eq.${semester.id},semester_id.is.null`);
    if (guruIds) aq = aq.in("guru_id", guruIds);
    const { data: rmpRows, error: aErr } = await aq;
    if (aErr) throw new Error(aErr.message);
    const rmp = (rmpRows ?? []) as any[];
    if (!rmp.length) return { semester, scoped: !privileged, assignments: [], studentScores: [] };

    const rombelIds = [...new Set(rmp.map((r) => r.rombel_id).filter(Boolean))] as string[];
    const mapelIds = [...new Set(rmp.map((r) => r.mata_pelajaran_id).filter(Boolean))] as string[];
    const gIds = [...new Set(rmp.map((r) => r.guru_id).filter(Boolean))] as string[];

    const [rombels, mapels, gurus, students] = await Promise.all([
      pagedIn(s, "rombel", "id, name, tingkat, konsentrasi_keahlian", "id", rombelIds),
      pagedIn(s, "mata_pelajaran", "id, nama, kode", "id", mapelIds),
      pagedIn(s, "guru", "id, nama, nip", "id", gIds),
      pagedIn(s, "students", "id, name, nis, rombel_id", "rombel_id", rombelIds),
    ]);

    const rombelMap = new Map(rombels.map((r) => [r.id, r]));
    const mapelMap = new Map(mapels.map((r) => [r.id, r]));
    const guruMap = new Map(gurus.map((r) => [r.id, r]));
    const studentsByRombel = new Map<string, any[]>();
    for (const st of students) {
      const list = studentsByRombel.get(st.rombel_id) ?? [];
      list.push(st);
      studentsByRombel.set(st.rombel_id, list);
    }

    // Tujuan pembelajaran per assignment
    const tps = await pagedIn(
      s,
      "tujuan_pembelajaran",
      "id, rombel_mata_pelajaran_id, kode_tp, komponen_type, is_active, semester_id",
      "rombel_mata_pelajaran_id",
      rmp.map((r) => r.id),
      (q) => q.or(`semester_id.eq.${semester.id},semester_id.is.null`),
    );
    const tpsByAssignment = new Map<string, any[]>();
    for (const tp of tps) {
      if (tp.is_active === false) continue;
      const list = tpsByAssignment.get(tp.rombel_mata_pelajaran_id) ?? [];
      list.push(tp);
      tpsByAssignment.set(tp.rombel_mata_pelajaran_id, list);
    }

    const tpIds = tps.map((t) => t.id) as string[];
    const grades = tpIds.length
      ? await pagedIn(
          s,
          "nilai_siswa",
          "tujuan_pembelajaran_id, student_id, nilai",
          "tujuan_pembelajaran_id",
          tpIds,
          (q) => q.or(`semester_id.eq.${semester.id},semester_id.is.null`),
        )
      : [];

    const tpToAssignment = new Map(tps.map((t) => [t.id, t.rombel_mata_pelajaran_id]));

    // aggregate: per assignment, and per assignment+student
    const perAssignment = new Map<string, { sum: number; count: number }>();
    const perAssignmentStudent = new Map<string, { sum: number; count: number }>();
    for (const g of grades) {
      const aid = tpToAssignment.get(g.tujuan_pembelajaran_id);
      if (!aid) continue;
      const val = Number(g.nilai);
      if (!Number.isFinite(val)) continue;
      const a = perAssignment.get(aid) ?? { sum: 0, count: 0 };
      a.sum += val;
      a.count += 1;
      perAssignment.set(aid, a);
      const key = `${aid}|${g.student_id}`;
      const b = perAssignmentStudent.get(key) ?? { sum: 0, count: 0 };
      b.sum += val;
      b.count += 1;
      perAssignmentStudent.set(key, b);
    }

    const assignments = rmp.map((r) => {
      const rb = rombelMap.get(r.rombel_id) as any;
      const mp = mapelMap.get(r.mata_pelajaran_id) as any;
      const gu = guruMap.get(r.guru_id) as any;
      const tpCount = (tpsByAssignment.get(r.id) ?? []).length;
      const studentCount = (studentsByRombel.get(r.rombel_id) ?? []).length;
      const agg = perAssignment.get(r.id) ?? { sum: 0, count: 0 };
      const expected = tpCount * studentCount;
      return {
        id: r.id,
        rombel_id: r.rombel_id,
        rombel_name: rb?.name ?? "—",
        tingkat: rb?.tingkat ?? "—",
        konsentrasi: rb?.konsentrasi_keahlian ?? "—",
        mapel_id: r.mata_pelajaran_id,
        mapel_name: mp?.nama ?? "—",
        guru_id: r.guru_id,
        guru_name: gu?.nama ?? "— Belum ada guru —",
        guru_nip: gu?.nip ?? null,
        tpCount,
        studentCount,
        expected,
        filled: agg.count,
        avg: agg.count ? agg.sum / agg.count : null,
      };
    });

    const studentScores: any[] = [];
    for (const r of rmp) {
      const rb = rombelMap.get(r.rombel_id) as any;
      const mp = mapelMap.get(r.mata_pelajaran_id) as any;
      const gu = guruMap.get(r.guru_id) as any;
      for (const st of studentsByRombel.get(r.rombel_id) ?? []) {
        const agg = perAssignmentStudent.get(`${r.id}|${st.id}`);
        if (!agg || !agg.count) continue;
        studentScores.push({
          student_id: st.id,
          student_name: st.name,
          nis: st.nis,
          rombel_name: rb?.name ?? "—",
          tingkat: rb?.tingkat ?? "—",
          konsentrasi: rb?.konsentrasi_keahlian ?? "—",
          mapel_id: r.mata_pelajaran_id,
          mapel_name: mp?.nama ?? "—",
          guru_name: gu?.nama ?? "—",
          avg: agg.sum / agg.count,
          count: agg.count,
        });
      }
    }

    return { semester, scoped: !privileged, assignments, studentScores };
  });
