"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Sparkles, X, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";

interface VoiceSearchButtonProps {
  onTranscript?: (text: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface DropdownPosition {
  top: number;
  right: number;
  isMobile: boolean;
}

const SAMPLE_PROMPTS = [
  "Dune: Part Two",
  "Cyberpunk: Edgerunners",
  "Arcane",
  "Interstellar",
  "Attack on Titan",
  "Demon Slayer",
  "Spider-Man",
];

export function VoiceSearchButton({
  onTranscript,
  className = "",
  size = "md",
}: VoiceSearchButtonProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [position, setPosition] = useState<DropdownPosition>({
    top: 70,
    right: 16,
    isMobile: false,
  });

  // Client-only check for hydration safety
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setIsSupported(false);
      }
    }
  }, []);

  // Calculate dropdown positioning relative to trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      setPosition({
        top: Math.max(rect.bottom + 10, 60),
        right: 16,
        isMobile: true,
      });
    } else {
      // Align dropdown to the right edge of the search container or button
      const rightOffset = Math.max(16, window.innerWidth - rect.right);
      setPosition({
        top: rect.bottom + 10,
        right: rightOffset,
        isMobile: false,
      });
    }
  }, []);

  // Update position on open and on window resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen, updatePosition]);

  // Handle click outside & Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        triggerRef.current.contains(target)
      ) {
        return;
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        stopListening();
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopListening();
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMessage(null);
    setTranscript("");

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      setErrorMessage(
        "Voice input is not supported in this browser. You can type your query in the search bar."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore abort
        }
      }

      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission was denied. Please allow microphone access.");
        } else if (event.error === "no-speech") {
          setErrorMessage("No voice detected. Tap 'Listen Again' and speak clearly.");
        } else {
          setErrorMessage(`Voice recognition failed (${event.error}). Please try again.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setErrorMessage("Could not activate microphone. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsListening(false);
  };

  const handleToggle = () => {
    if (isOpen) {
      stopListening();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setTranscript("");
      setErrorMessage(null);
      // Small timeout to allow state to settle before starting speech
      setTimeout(() => {
        startListening();
      }, 50);
    }
  };

  const applyTranscript = (textToApply: string) => {
    const trimmed = textToApply.trim();
    if (!trimmed) return;
    stopListening();
    setIsOpen(false);

    if (onTranscript) {
      onTranscript(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const sizeClasses = {
    sm: "p-1.5 h-7 w-7 text-xs",
    md: "p-2 h-8 w-8 text-sm",
    lg: "p-2.5 h-10 w-10 text-base",
  }[size];

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={isOpen && isListening ? "Stop voice search" : "Open voice search"}
        title={isOpen ? "Close voice search" : "Search by voice"}
        data-testid="voice-search-trigger"
        className={`relative inline-flex items-center justify-center rounded-xl transition-all duration-300 ${sizeClasses} ${
          isOpen
            ? "bg-primary text-primary-contrast shadow-md shadow-primary/30 scale-105"
            : "text-on-surface-variant hover:text-primary hover:bg-surface/80 active:scale-95"
        } ${className}`}
      >
        {isListening ? (
          <Mic className="h-4 w-4 animate-pulse text-white" />
        ) : (
          <Mic className="h-4 w-4" />
        )}

        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
      </button>

      {/* Unconstrained Portal Dropdown */}
      {mounted &&
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Backdrop for click outside on mobile / focus trap */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300 sm:bg-black/20"
              onClick={() => {
                stopListening();
                setIsOpen(false);
              }}
            />

            {/* Dropdown Container */}
            <div
              ref={dropdownRef}
              data-testid="voice-search-dropdown"
              style={
                position.isMobile
                  ? {
                      top: `${position.top}px`,
                      left: "16px",
                      right: "16px",
                    }
                  : {
                      top: `${position.top}px`,
                      right: `${position.right}px`,
                      width: "380px",
                    }
              }
              className="pointer-events-auto absolute z-[101] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#0b0e17]/95 p-5 shadow-2xl backdrop-blur-2xl transition-all duration-200 animate-scale-up"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold tracking-wide text-white">
                      Voice Search
                    </h3>
                    <p className="text-[10px] font-mono text-white/50">
                      {isListening ? "Listening now..." : "Audio input ready"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    setIsOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close voice search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Main Listening Center */}
              <div className="flex flex-col items-center justify-center py-4 text-center">
                {/* Glowing Mic Orb */}
                <div className="relative flex items-center justify-center my-2">
                  {isListening && (
                    <>
                      <span className="absolute h-20 w-20 rounded-full bg-primary/20 animate-ping" />
                      <span className="absolute h-16 w-16 rounded-full bg-primary/30 animate-pulse" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 active:scale-95 ${
                      isListening
                        ? "bg-gradient-to-tr from-primary to-rose-600 text-white shadow-primary/40 scale-105"
                        : "bg-white/10 hover:bg-white/15 border border-white/15 text-white"
                    }`}
                  >
                    {isListening ? (
                      <Mic className="h-7 w-7 animate-pulse text-white" />
                    ) : (
                      <MicOff className="h-6 w-6 text-white/70" />
                    )}
                  </button>
                </div>

                {/* Animated frequency equalizer bars */}
                {isListening ? (
                  <div className="flex items-center gap-1 mt-3 h-5">
                    {[30, 70, 100, 50, 85, 40, 95, 60, 45].map((height, idx) => (
                      <span
                        key={idx}
                        className="w-1 bg-gradient-to-t from-primary to-rose-400 rounded-full animate-pulse"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${idx * 110}ms`,
                          animationDuration: "800ms",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/50 mt-2">
                    Tap the mic to start listening
                  </p>
                )}

                {/* Live Transcript Display */}
                <div className="mt-3 w-full">
                  {transcript ? (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-primary/10 border border-primary/25 px-3 py-2.5">
                        <p className="text-xs font-semibold text-primary break-words">
                          “{transcript}”
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTranscript(transcript)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-opacity-90 py-2.5 px-4 text-xs font-bold text-primary-contrast uppercase tracking-wider transition-all shadow-lg shadow-primary/25 active:scale-95"
                      >
                        <span>Search For “{transcript}”</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-white/80 font-medium">
                        {isListening
                          ? "Say a movie, TV show, anime, or genre..."
                          : "Speak clearly into your microphone"}
                      </p>
                      {errorMessage && (
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400 pt-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Retry action button when not listening */}
                {!isListening && (
                  <button
                    type="button"
                    onClick={startListening}
                    className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Listen Again</span>
                  </button>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="border-t border-white/10 pt-3 text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1 mb-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Popular Voice Queries:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => applyTranscript(prompt)}
                      className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-white/80 transition-all active:scale-95 whitespace-nowrap"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
