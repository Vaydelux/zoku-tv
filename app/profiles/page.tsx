"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores";
import { Plus, Trash2, Edit2, Shield, Tv, Sparkles, X, Loader2 } from "lucide-react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import { Toast, type ToastType } from "@/components/Toast";
import { LoadingBanner } from "@/components/LoadingBanner";
import { LoadingButton } from "@/components/LoadingButton";
import {
  DEFAULT_PROFILE_AVATAR,
  DEFAULT_PROFILE_AVATAR_COLOR,
  normalizeProfileAvatarColor,
  profileAvatarSrc,
  randomPresetAvatarId,
  randomProfileAvatarColor,
  resolveAvatarId,
} from "@/lib/profile-avatars";
import { canAddProfile, MAX_PROFILES } from "@/lib/profile-limits";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

export default function ProfilesPage() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const { user, profiles, setProfile, createProfile, deleteProfile, updateProfile, initializing } = useSessionStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(DEFAULT_PROFILE_AVATAR.id);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PROFILE_AVATAR_COLOR);
  const [kidMode, setKidMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectingProfileId, setSelectingProfileId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showModal = isCreating || isEditing;
  const isBusy = isSubmitting || selectingProfileId !== null || deletingProfileId !== null || isNavigating;
  const selectingProfile = profiles.find((profile) => profile.id === selectingProfileId);

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/login");
    }
  }, [user, initializing, router]);

  const resetForm = useCallback(() => {
    setNewName("");
    setSelectedAvatarId(randomPresetAvatarId());
    setSelectedColor(randomProfileAvatarColor());
    setKidMode(false);
    setEditProfileId(null);
    setFormError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsCreating(false);
    setIsEditing(false);
    setIsSubmitting(false);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, closeModal]);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const handleSelect = (p: (typeof profiles)[number]) => {
    if (isBusy) return;
    setSelectingProfileId(p.id);
    setProfile(p);
    startTransition(() => {
      router.push("/home");
    });
  };

  const openCreateModal = () => {
    if (!canAddProfile(profiles.length)) {
      showToast(`Maximum of ${MAX_PROFILES} profiles reached. Delete one to add another.`, "error");
      return;
    }
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    if (!canAddProfile(profiles.length)) {
      const message = `Maximum of ${MAX_PROFILES} profiles reached. Delete one to add another.`;
      setFormError(message);
      showToast(message, "error");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await createProfile(
        newName.trim(),
        profileAvatarSrc(selectedAvatarId),
        kidMode,
        selectedColor
      );

      if (!result.success) {
        const message = result.error ?? "Could not create profile. Please try again.";
        setFormError(message);
        showToast(message, "error");
        return;
      }

      closeModal();
      showToast(`"${newName.trim()}" is ready to stream.`, "success");
    } catch {
      const message = "Could not create profile. Please try again.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (p: (typeof profiles)[number]) => {
    setEditProfileId(p.id);
    setNewName(p.name);
    const resolved = resolveAvatarId(p.avatar);
    setSelectedAvatarId(resolved === "legacy" ? DEFAULT_PROFILE_AVATAR.id : resolved);
    setSelectedColor(normalizeProfileAvatarColor(p.avatarColor));
    setKidMode(p.kidMode);
    setFormError(null);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileId || !newName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await updateProfile(editProfileId, {
        name: newName.trim(),
        avatar: profileAvatarSrc(selectedAvatarId),
        avatarColor: selectedColor,
        kidMode,
      });
      closeModal();
      showToast("Profile settings saved.", "success");
    } catch {
      const message = "Could not save profile. Please try again.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isBusy) return;
    if (confirm("Are you sure you want to delete this profile? All history and watchlist will be lost.")) {
      setDeletingProfileId(id);
      try {
        await deleteProfile(id);
        showToast("Profile deleted.", "success");
      } finally {
        setDeletingProfileId(null);
      }
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
      {(selectingProfileId || isNavigating) && (
        <LoadingBanner
          message={
            selectingProfile
              ? `Opening ${selectingProfile.name}'s portal...`
              : "Loading your streaming dashboard..."
          }
        />
      )}

      {isSubmitting && showModal && (
        <LoadingBanner message={isCreating ? "Creating your portal..." : "Saving profile settings..."} />
      )}

      {deletingProfileId && <LoadingBanner message="Removing profile..." />}

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/10 via-transparent to-black" />

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-6 sm:mb-8 text-primary">
          <Tv className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-on-surface">
            ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-medium tracking-tight text-center text-on-surface mb-2">
          Who is watching?
        </h1>
        <p className="text-xs text-on-surface-variant text-center mb-8 sm:mb-12 px-2">
          Select a profile or manage your active portals below.
        </p>

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8 justify-center w-full max-w-3xl ${isBusy ? "pointer-events-none opacity-60" : ""}`}>
          {profiles.map((p) => {
            const isSelecting = selectingProfileId === p.id;
            const isDeleting = deletingProfileId === p.id;

            return (
            <div key={p.id} className="group relative flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => handleSelect(p)}
                disabled={isBusy}
                aria-busy={isSelecting}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelecting
                    ? "border-primary scale-105 cursor-wait"
                    : "border-transparent group-hover:border-primary cursor-pointer transform group-hover:scale-105"
                } disabled:cursor-not-allowed`}
              >
                <ProfileAvatarDisplay
                  avatar={p.avatar}
                  avatarColor={p.avatarColor}
                  name={p.name}
                  size="lg"
                />
                {isSelecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
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
                  type="button"
                  onClick={() => handleEditOpen(p)}
                  disabled={isBusy}
                  className="p-1.5 rounded bg-surface hover:bg-surface-hover text-on-surface-variant hover:text-primary transition-colors border border-border-custom disabled:opacity-50"
                  title="Edit Profile"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={isBusy}
                    className="p-1.5 rounded bg-surface hover:bg-surface-hover text-on-surface-variant hover:text-red-500 transition-colors border border-border-custom disabled:opacity-50"
                    title="Delete Profile"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
          })}

          {canAddProfile(profiles.length) && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                disabled={isBusy}
                className="flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-2xl border-2 border-dashed border-border-custom hover:border-primary bg-surface/30 hover:bg-surface/50 text-on-surface-variant hover:text-primary transform hover:scale-105 transition-all duration-300 shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-8 w-8" />
              </button>
              <span className="font-medium text-sm text-on-surface-variant">Add Profile</span>
            </div>
          )}
        </div>

        {!canAddProfile(profiles.length) && (
          <p className="mt-8 text-center text-xs text-on-surface-variant">
            You have reached the maximum of {MAX_PROFILES} profiles.
          </p>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-custom bg-surface p-4 shadow-2xl backdrop-blur-xl sm:max-w-xl sm:rounded-3xl sm:p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full border border-border-custom p-1.5 text-on-surface-variant transition-colors hover:bg-surface-hover hover:text-on-surface sm:right-4 sm:top-4"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 id="profile-modal-title" className="mb-4 flex items-center gap-2 pr-10 text-lg font-display font-semibold sm:mb-6 sm:text-xl">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <span>{isCreating ? "New Streaming Portal" : "Configure Portal"}</span>
            </h2>

            {formError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 animate-fade-in">
                <span>{formError}</span>
              </div>
            )}

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

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border-custom bg-background/40 p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface sm:text-sm">Kids Experience</p>
                  <p className="text-[10px] text-on-surface-variant sm:text-xs">
                    Only show family-friendly PG titles
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={kidMode}
                    onChange={(e) => setKidMode(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-border-custom after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-border-custom py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-hover disabled:opacity-50 sm:text-sm"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={isSubmitting}
                  loadingText={isCreating ? "Launching portal..." : "Saving settings..."}
                  disabled={isCreating && !canAddProfile(profiles.length)}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white transition-colors hover:bg-opacity-90 sm:text-sm"
                >
                  {isCreating ? "Launch Portal" : "Save Settings"}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
