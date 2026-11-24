import { it, expect } from "vitest";
import { nameFromMembers } from "../../src/modules/groups/groups.service.js";

it("joins usernames", () => {
  expect(nameFromMembers([])).toBe("");
  expect(nameFromMembers(["a"])).toBe("a");
  expect(nameFromMembers(["a", "b"])).toBe("a & b");
  expect(nameFromMembers(["a", "b", "c"])).toBe("a, b & c");
});
