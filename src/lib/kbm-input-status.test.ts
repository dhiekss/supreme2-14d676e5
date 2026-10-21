import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { summarizeKbmInput } from "./kbm-input-status";

describe("status input KBM", () => {
  test("memeriksa tepat jam 1–9 termasuk rombel tanpa laporan", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], []);
    assert.deepEqual(row?.missing, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(row?.missingCount, 9);
  });
  test("jam sudah diinput terpisah dari jam belum diinput dan laporan duplikat tidak menambah jumlah", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], [
      { rombel_id: "a", jam_list: [1, 2, 9, 10] },
      { rombel_id: "a", jam_list: [2, 3] },
      { rombel_id: "b", jam_list: [4] },
    ]);
    assert.deepEqual(row?.filled, [1, 2, 3, 9]);
    assert.deepEqual(row?.missing, [4, 5, 6, 7, 8]);
    assert.equal(row?.missingCount, 5);
  });
  test("semua jam tercatat berarti tidak ada jam kosong", () => {
    const [row] = summarizeKbmInput([{ id: "a", name: "X OTO G" }], [
      { rombel_id: "a", jam_list: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ]);
    assert.equal(row?.filled.length, 9);
    assert.equal(row?.missingCount, 0);
  });
});