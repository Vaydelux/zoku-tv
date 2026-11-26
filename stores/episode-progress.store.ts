import { create } from "zustand";
import {
  setDocument,
  getCollectionRef,
  getDocRef,
  listenToCollection,
} from "@/lib/firebase";
import {
  episodeProgressKey,
  mergeEpisodeProgress,
  readLocalEpisodeProgress,
  resetEpisodeProgressRecord,
  upsertEpisodeProgressRecord,
  writeLocalEpisodeProgress,
  type EpisodeProgressRecord,
  type EpisodeProgressUpsertInput,
} from "@/lib/episode-progress";
import { useSessionStore } from "./session.store";

export interface EpisodeProgressState {
  records: Record<string, EpisodeProgressRecord>;
  initEpisodeProgress: () => () => void;
  getProgress: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => EpisodeProgressRecord | null;
  getProgressPercent: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => number;
  isEpisodeCompleted: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => boolean;
  recordEpisodeProgress: (input: EpisodeProgressUpsertInput) => Promise<void>;
  resetEpisodeProgress: (
    media_type: "tv" | "anime",
    id: number,
    season: number,
    episode: number
  ) => Promise<void>;
}

export const useEpisodeProgressStore = create<EpisodeProgressState>((set, get) => ({
  records: {},

  initEpisodeProgress: () => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;

    if (!user || !profile) {
      set({ records: {} });
      return () => {};
    }

    const profileId = profile.id;
    const colPath = `users/${user.uid}/profiles/${profileId}/episodeProgress`;
    const localRecords = readLocalEpisodeProgress(profileId);
    set({ records: localRecords });

    const colRef = getCollectionRef(colPath);
    const unsubscribe = listenToCollection(colRef, (snapshot) => {
      const cloudRecords: EpisodeProgressRecord[] = [];
      snapshot.forEach((docSnap: { data: () => EpisodeProgressRecord }) => {
        cloudRecords.push(docSnap.data() as EpisodeProgressRecord);
      });

      const currentLocal = readLocalEpisodeProgress(profileId);
      const merged = mergeEpisodeProgress(currentLocal, cloudRecords);
      set({ records: merged });
      writeLocalEpisodeProgress(profileId, merged);
    });

    return unsubscribe;
  },

  getProgress: (media_type, id, season, episode) => {
    const key = episodeProgressKey(media_type, id, season, episode);
    return get().records[key] ?? null;
  },

  getProgressPercent: (media_type, id, season, episode) => {
    const rec = get().getProgress(media_type, id, season, episode);
    return rec ? rec.progress_percent : 0;
  },

  isEpisodeCompleted: (media_type, id, season, episode) => {
    const rec = get().getProgress(media_type, id, season, episode);
    return Boolean(rec?.completed);
  },

  recordEpisodeProgress: async (input) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const res = upsertEpisodeProgressRecord(get().records, input);
    if (!res) return;

    const { key, record, records } = res;
    set({ records });
    writeLocalEpisodeProgress(profile.id, records);

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/episodeProgress`,
        key
      );
      await setDocument(docRef, record);
    } catch (e) {
      console.error("Failed to persist episode progress", e);
    }
  },

  resetEpisodeProgress: async (media_type, id, season, episode) => {
    const session = useSessionStore.getState();
    const user = session.user;
    const profile = session.currentProfile;
    if (!user || !profile) return;

    const res = resetEpisodeProgressRecord(get().records, media_type, id, season, episode);
    set({ records: res.records });
    writeLocalEpisodeProgress(profile.id, res.records);

    try {
      const docRef = getDocRef(
        `users/${user.uid}/profiles/${profile.id}/episodeProgress`,
        res.key
      );
      await setDocument(docRef, res.record);
    } catch (e) {
      console.error("Failed to reset episode progress", e);
    }
  },
}));
