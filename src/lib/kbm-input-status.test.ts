import { describe, expect, test } from "bun:test";
import { summarizeKbmInput } from "./kbm-input-status";

describe("status input KBM", () => {
  test("memeriksa tepat jam 1–9 termasuk rombel tanpa laporan", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], []);
    expect(row?.missing).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(row?.missingCount).toBe(9);
  });
  test("jam sudah diinput terpisah dari jam belum diinput dan laporan duplikat tidak menambah jumlah", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], [
      { rombel_id: "a", jam_list: [1, 2, 9, 10] },
      { rombel_id: "a", jam_list: [2, 3] },
      { rombel_id: "b", jam_list: [4] },
    ]);
    expect(row?.filled).toEqual([1, 2, 3, 9]);
    expect(row?.missing).toEqual([4, 5, 6, 7, 8]);
    expect(row?.missingCount).toBe(5);
  });
  test("semua jam tercatat berarti tidak ada jam kosong", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], [
      { rombel_id: "a", jam_list: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ]);
    expect(row?.filled).toHaveLength(9);
    expect(row?.missingCount).toBe(0);
  });
});