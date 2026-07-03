export const MAX_PROFILES = 4;

export function canAddProfile(profileCount: number): boolean {
  return profileCount < MAX_PROFILES;
}
