import { describe, expect, test } from "vitest";
import { activityVisible } from "@/lib/activity-visible";

describe("activityVisible", () => {
  test("returns hidden for false", () => {
    expect(activityVisible(false)).toBe("hidden");
  });

  test("returns hidden for null", () => {
    expect(activityVisible(null)).toBe("hidden");
  });

  test("returns hidden for undefined", () => {
    expect(activityVisible(undefined)).toBe("hidden");
  });

  test("returns visible for truthy values", () => {
    expect(activityVisible(true)).toBe("visible");
  });

  test("returns visible for other falsy values", () => {
    expect(activityVisible(0)).toBe("visible");
    expect(activityVisible("")).toBe("visible");
  });
});
