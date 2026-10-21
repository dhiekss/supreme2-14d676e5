export const KBM_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function summarizeKbmInput(
  rombel: { id: string; name: string | null; tingkat?: string | null }[],
  reports: { rombel_id: string | null; jam_list: number[] | null }[],
) {
  const input = new Map<string, Set<number>>();
  for (const report of reports) {
    if (!report.rombel_id) continue;
    const periods = input.get(report.rombel_id) ?? new Set<number>();
    for (const jam of report.jam_list ?? []) periods.add(jam);
    input.set(report.rombel_id, periods);
  }
  return rombel.map((r) => {
    const recorded = input.get(r.id);
    const filled = KBM_PERIODS.filter((jam) => recorded?.has(jam));
    const missing = KBM_PERIODS.filter((jam) => !recorded?.has(jam));
    return { ...r, filled, missing, missingCount: missing.length };
  });
}