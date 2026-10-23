import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { canReadPjjReport, scopePjjQuery } from "./pjj-access";

describe("PJJ ownership", () => {
  it("input lists only the signed-in account, including admins", () => {
    assert.equal(canReadPjjReport("other", "self", ["admin"], false), false);
    assert.equal(canReadPjjReport("self", "self", ["guru"], false), true);
  });
  it("admin recap includes all owners", () => {
    assert.equal(canReadPjjReport("other", "self", ["admin"], true), true);
    assert.equal(canReadPjjReport("other", "self", ["superadmin"], true), true);
  });
  it("non-admin recap filters by the signed-in owner", () => {
    for (const role of ["guru", "staff_kurikulum", "wakasek", "walas", "murid"]) {
      const filters: string[][] = [];
      const query = { eq(column: string, value: string) { filters.push([column, value]); return this; } };
      scopePjjQuery(query, "self", [role], true);
      assert.deepEqual(filters, [["created_by", "self"]]);
      assert.equal(canReadPjjReport("other", "self", [role], true), false);
    }
  });
});