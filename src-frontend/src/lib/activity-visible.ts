type ActivityMode = "visible" | "hidden";
export function activityVisible(condition: unknown): ActivityMode {
  const isFalse =
    condition === false || condition === null || condition === undefined;
  if (isFalse) {
    return "hidden";
  }
  return "visible";
}
