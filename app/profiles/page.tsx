"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores";
import { Plus, Trash2, Edit2, Shield, Tv, Sparkles } from "lucide-react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import {
  DEFAULT_PROFILE_AVATAR,
  DEFAULT_PROFILE_AVATAR_COLOR,
  normalizeProfileAvatarColor,
  profileAvatarSrc,
  randomPresetAvatarId,
  randomProfileAvatarColor,
  resolveAvatarId,
} from "@/lib/profile-avatars";

export default function ProfilesPage() {
  const router = useRouter();
  const { user, profiles, currentProfile, setProfile, createProfile, deleteProfile, updateProfile, initializing } = useSessionStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_PROFILE_AVATAR.id);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PROFILE_AVATAR_COLOR);
  const [kidMode, setKidMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/login");
    }
  }, [user, initializing, router]);

  const resetForm = () => {
    setNewName("");
    setSelectedAvatarId(randomPresetAvatarId());
    setSelectedColor(randomProfileAvatarColor());
    setKidMode(false);
    setEditProfileId(null);
  };

  const handleSelect = (p: (typeof profiles)[number]) => {
    setProfile(p);
    router.push("/home");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createProfile(newName.trim(), profileAvatarSrc(selectedAvatarId), kidMode, selectedColor);
    resetForm();
    setIsCreating(false);
  };

  const handleEditOpen = (p: (typeof profiles)[number]) => {
    setEditProfileId(p.id);
    setNewName(p.name);
    const resolved = resolveAvatarId(p.avatar);
    setSelectedAvatarId(resolved === "legacy" ? DEFAULT_PROFILE_AVATAR.id : resolved);
    setSelectedColor(normalizeProfileAvatarColor(p.avatarColor));
    setKidMode(p.kidMode);
    setIsEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileId || !newName.trim()) return;
    await updateProfile(editProfileId, {
      name: newName.trim(),
      avatar: profileAvatarSrc(selectedAvatarId),
      avatarColor: selectedColor,
      kidMode,
    });
    resetForm();
    setIsEditing(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this profile? All history and watchlist will be lost.")) {
      await deleteProfile(id);
    }
  };

  if (initializing || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Tv className="h-10 w-10 text-primary animate-ping" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black text-on-surface px-4 py-8 sm:py-12">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/10 via-transparent to-black" />

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-6 sm:mb-8 text-primary">
          <Tv className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-on-surface">
            ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
          </span>
        </div>

        {!isCreating && !isEditing ? (
          <>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-medium tracking-tight text-center text-on-surface mb-2">
              Who is watching?
            </h1>
            <p className="text-xs text-on-surface-variant text-center mb-8 sm:mb-12 px-2">
              Select a profile or manage your active portals below.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8 justify-center w-full max-w-3xl">
              {profiles.map((p) => (
                <div key={p.id} className="group relative flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="relative rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-primary cursor-pointer transform group-hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ProfileAvatarDisplay
                      avatar={p.avatar}
                      avatarColor={p.avatarColor}
                      name={p.name}
                      size="lg"
                    />
                    {p.kidMode && (
                      <div className="absolute bottom-1 right-1 bg-yellow-500 text-black p-0.5 rounded font-mono text-[9px] uppercase font-bold flex items-center gap-0.5">
                        <Shield className="h-2 w-2" />
                        <span>Kid</span>
                      </div>
                    )}
                  </button>

                  <span className="font-medium text-sm text-on-surface-variant group-hover:text-on-surface transition-colors truncate max-w-full px-1">
                    {p.name}
                  </span>

                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleEditOpen(p)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-hover text-on-surface-variant hover:text-primary transition-colors border border-border-custom"
                      title="Edit Profile"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded bg-surface hover:bg-surface-hover text-on-surface-variant hover:text-red-500 transition-colors border border-border-custom"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {profiles.length < 4 && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => {
                      resetForm();
                      setIsCreating(true);
                    }}
                    className="flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-2xl border-2 border-dashed border-border-custom hover:border-primary bg-surface/30 hover:bg-surface/50 text-on-surface-variant hover:text-primary transform hover:scale-105 transition-all duration-300 shadow-md"
                  >
                    <Plus className="h-8 w-8" />
                  </button>
                  <span className="font-medium text-sm text-on-surface-variant">Add Profile</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full max-w-lg sm:max-w-xl rounded-2xl sm:rounded-3xl border border-border-custom bg-surface p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-fade-in max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-display font-semibold mb-4 sm:mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <span>{isCreating ? "New Streaming Portal" : "Configure Portal"}</span>
            </h2>

            <form onSubmit={isCreating ? handleCreate : handleEditSave} className="space-y-5 sm:space-y-6">
              <AvatarPicker
                selectedAvatarId={selectedAvatarId}
                selectedColor={selectedColor}
                profileName={newName || "Viewer"}
                onAvatarChange={setSelectedAvatarId}
                onColorChange={setSelectedColor}
              />

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Action Hero"
                  className="w-full rounded-xl border border-border-custom bg-background/50 py-2.5 px-4 text-xs sm:text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-background/40 border border-border-custom">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-on-surface">Kids Experience</p>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant">
                    Only show family-friendly PG titles
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kidMode}
                    onChange={(e) => setKidMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border-custom peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border-custom text-xs sm:text-sm font-semibold hover:bg-surface-hover text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs sm:text-sm font-semibold text-white hover:bg-opacity-90 transition-colors"
                >
                  {isCreating ? "Launch Portal" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
