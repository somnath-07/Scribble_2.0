import type { AvatarConfig, PlayerProfile } from '../../shared/game-types';

const PROFILE_KEY = 'scribble2:profile';
export const BODY_COLORS = ['#f6c7a8', '#c98b63', '#7c4a2d', '#fde68a', '#ff303f', '#a7f3d0', '#21deec', '#bfdbfe', '#ddd6fe', '#fecdd3'];

export function randomAvatar(): AvatarConfig {
  return {
    body: BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)],
    eyes: Math.floor(Math.random() * 4),
    mouth: Math.floor(Math.random() * 4),
    accessory: Math.floor(Math.random() * 4),
  };
}

export function loadProfile(): PlayerProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return null;
    const profile = JSON.parse(stored) as PlayerProfile;
    if (!profile.id || !profile.name || !profile.avatar) return null;
    if (!profile.reconnectToken) {
      profile.reconnectToken = crypto.randomUUID();
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
    return profile;
  } catch {
    return null;
  }
}

export function saveProfile(name: string, avatar: AvatarConfig, existingId?: string): PlayerProfile {
  const existing = loadProfile();
  const profile: PlayerProfile = {
    id: existingId ?? crypto.randomUUID(),
    name: name.trim().replace(/\s+/g, ' ').slice(0, 20),
    avatar,
    reconnectToken: existing && existing.id === existingId ? existing.reconnectToken : crypto.randomUUID(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
