import { test } from "node:test";
import assert from "node:assert/strict";
import { pjjClassSlots, matchesPjjSchedule } from "./pjj-schedule.ts";

const friday = [{ rombel_id: "xi-aphp-a", mata_pelajaran_id: "konsentrasi", jam_list: [6, 7, 8, 9], is_kelompok: false }];
test("kelas muncul hanya ketika terdapat jadwal pada hari yang dipilih", () => {
  assert.deepEqual(pjjClassSlots(friday).map(slot => slot.rombel_id), ["xi-aphp-a"]);
  assert.deepEqual(pjjClassSlots([]), []);
});
test("kelas, mapel, dan jam mengikuti slot mengajar", () => {
  assert.equal(matchesPjjSchedule(friday, "xi-aphp-a", "konsentrasi", [6, 7, 8, 9]), true);
  assert.equal(matchesPjjSchedule(friday, "kelas-lain", "konsentrasi", [6]), false);
  assert.equal(matchesPjjSchedule(friday, "xi-aphp-a", "mapel-lain", [6]), false);
  assert.equal(matchesPjjSchedule(friday, "xi-aphp-a", "konsentrasi", [1]), false);
});