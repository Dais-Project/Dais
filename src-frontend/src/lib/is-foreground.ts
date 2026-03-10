export function isForeground(): boolean {
  const isVisible = document.visibilityState === "visible";
  const isFocused = document.hasFocus();
  return isVisible && isFocused;
}
