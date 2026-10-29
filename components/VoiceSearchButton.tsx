"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, Sparkles, X, AlertCircle } from "lucide-react";

interface VoiceSearchButtonProps {
  onTranscript?: (text: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceSearchButton({
  onTranscript,
  className = "",
  size = "md",
}: VoiceSearchButtonProps) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = () => {
    setErrorMessage(null);
    setTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage("Speech recognition is not supported in this browser. You can type your query directly.");
      setShowOverlay(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setShowOverlay(true);
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
          setErrorMessage("Microphone permission was denied. Please allow microphone access in your browser.");
        } else if (event.error === "no-speech") {
          setErrorMessage("No speech was detected. Please try speaking again.");
        } else {
          setErrorMessage(`Voice recognition failed: ${event.error}`);
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

  const applyTranscript = (textToApply: string) => {
    const trimmed = textToApply.trim();
    if (!trimmed) return;
    setShowOverlay(false);
    if (onTranscript) {
      onTranscript(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const samplePrompts = [
    "Dune: Part Two",
    "Cyberpunk: Edgerunners",
    "Arcane",
    "Interstellar",
    "Attack on Titan",
  ];

  const sizeClasses = {
    sm: "p-1.5 h-7 w-7 text-xs",
    md: "p-2 h-8 w-8 text-sm",
    lg: "p-2.5 h-10 w-10 text-base",
  }[size];

  return (
    <>
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? "Stop voice search" : "Search with voice"}
        title={isListening ? "Stop voice search" : "Search by voice"}
        className={`relative inline-flex items-center justify-center rounded-xl transition-all duration-300 ${sizeClasses} ${
          isListening
            ? "bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse scale-105"
            : "text-on-surface-variant hover:text-primary hover:bg-surface/80 active:scale-95"
        } ${className}`}
      >
        {isListening ? (
          <MicOff className="h-4 w-4 text-white" />
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

      {/* Voice Search Futuristic Modal Overlay */}
      {showOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0c14]/95 p-6 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <button
              type="button"
              onClick={() => {
                stopListening();
                setShowOverlay(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close voice search"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing Microphone Visualizer */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <>
                    <span className="absolute h-24 w-24 rounded-full bg-primary/20 animate-ping" />
                    <span className="absolute h-20 w-20 rounded-full bg-primary/30 animate-pulse" />
                  </>
                )}
                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 ${
                    isListening
                      ? "bg-gradient-to-tr from-primary to-fuchsia-600 text-white shadow-primary/40 scale-110"
                      : "bg-surface border border-border-custom text-on-surface"
                  }`}
                >
                  <Mic className="h-8 w-8" />
                </div>
              </div>

              {/* Animated audio bars when listening */}
              {isListening && (
                <div className="flex items-center gap-1.5 mt-5 h-6">
                  {[40, 75, 100, 60, 90, 45, 80, 55].map((height, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDelay: `${idx * 120}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Status & Live Transcript */}
            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold tracking-wide text-white">
                {isListening ? "Listening to your voice..." : "Voice Search"}
              </h3>

              {transcript ? (
                <p className="font-sans text-base text-primary font-semibold min-h-[3rem] px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  “{transcript}”
                </p>
              ) : (
                <p className="text-xs text-white/60">
                  {isListening
                    ? "Speak a movie, anime, TV series, actor, or genre clearly..."
                    : errorMessage || "Click the microphone below to try again"}
                </p>
              )}

              {errorMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3 pt-2">
              {transcript && (
                <button
                  type="button"
                  onClick={() => applyTranscript(transcript)}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-opacity-95 text-primary-contrast font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/25 active:scale-95"
                >
                  Search for “{transcript}”
                </button>
              )}

              {!isListening && (
                <button
                  type="button"
                  onClick={startListening}
                  className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all"
                >
                  Listen Again
                </button>
              )}

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5 pt-2 border-t border-white/10 text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Or tap a popular voice query:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => applyTranscript(prompt)}
                      className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-primary hover:text-primary text-[11px] font-medium text-white/80 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
