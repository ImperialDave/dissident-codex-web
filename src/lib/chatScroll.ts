const NEAR_BOTTOM_PX = 80;

export function isNearBottom(container: HTMLElement, threshold = NEAR_BOTTOM_PX): boolean {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
}

export function scrollToBottomIfPinned(
  container: HTMLElement | null,
  bottomEl: HTMLElement | null,
  options?: { force?: boolean; behavior?: ScrollBehavior }
): void {
  if (!container || !bottomEl) return;
  if (options?.force || isNearBottom(container)) {
    bottomEl.scrollIntoView({ behavior: options?.behavior ?? "auto", block: "end" });
  }
}