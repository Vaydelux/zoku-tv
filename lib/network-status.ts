export type NetworkConnectionState = "online" | "offline";

export interface NavbarNetworkStatusMeta {
  state: NetworkConnectionState;
  isOffline: boolean;
  label: string;
  shortLabel: string;
  description: string;
  dotColorClass: string;
  pingColorClass: string;
  badgeToneClass: string;
  navBorderClass: string;
}

/**
 * Pure helper that computes the top navbar connectivity status presentation
 * from the current browser online/offline boolean.
 */
export function getNavbarNetworkStatus(isOnline: boolean): NavbarNetworkStatusMeta {
  if (isOnline) {
    return {
      state: "online",
      isOffline: false,
      label: "Online",
      shortLabel: "Online",
      description: "Connected — live catalog discovery and profile sync active.",
      dotColorClass: "bg-emerald-400",
      pingColorClass: "bg-emerald-400/40",
      badgeToneClass:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40",
      navBorderClass: "border-border-custom",
    };
  }

  return {
    state: "offline",
    isOffline: true,
    label: "Offline-Only",
    shortLabel: "Offline",
    description:
      "Internet connection lost — operating in offline-only state. Cached Watch History and Continue Watching remain accessible.",
    dotColorClass: "bg-amber-400",
    pingColorClass: "bg-amber-400/60",
    badgeToneClass:
      "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.18)]",
    navBorderClass: "border-amber-500/35",
  };
}
