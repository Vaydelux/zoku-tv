/** Decision boundary for mouse-dragging horizontally scrollable poster rails.
 *
 * A full-poster title button is draggable like the old card surface. Dedicated
 * Watchlist/history actions and unrelated controls must keep normal click
 * behavior. Mouse click cancellation after a drag is handled by the rail hook.
 */
export function canBeginRailDrag(button: { classList: { contains(token: string): boolean } } | null | undefined): boolean {
  return !button || button.classList.contains("cinematic-poster-open");
}
