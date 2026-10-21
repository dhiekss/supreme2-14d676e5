import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { z } from "zod";
import { ROLES, getPrimaryRole } from "./roles";

describe("Staff Kurikulum", () => {
  it("is accepted by the role validator used for user assignment and menu settings", () => {
    assert.equal(z.enum(ROLES).parse("staff_kurikulum"), "staff_kurikulum");
    assert.equal(ROLES.filter((r) => r === "staff_kurikulum").length, 1);
    assert.equal(z.enum(ROLES).safeParse("unknown_role").success, false);
  });
  it("selects its own menu rather than the teacher fallback", () => {
    assert.equal(getPrimaryRole(["staff_kurikulum"]), "staff_kurikulum");
    assert.equal(getPrimaryRole(["guru", "staff_kurikulum"]), "staff_kurikulum");
  });
  it("preserves admin and superadmin priority", () => {
    assert.equal(getPrimaryRole(["staff_kurikulum", "admin"]), "admin");
    assert.equal(getPrimaryRole(["staff_kurikulum", "admin", "superadmin"]), "superadmin");
  });
});