"use client";

import { useState, useEffect } from "react";

/**
 * PWAInstallPrompt — Download NigWrite as a real app.
 *
 * On Android: installs as a native app in your app drawer (no browser).
 * On Desktop (Chrome/Edge): installs as a desktop app with its own window.
 * On iOS: shows instructions to save to home screen (opens fullscreen).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true || window.matchMedia("(display-mode: standalone)").matches
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem("nigwrite-install-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 3 * 24 * 60 * 60 * 1000) { // 3 days instead of 7
        setDismissed(true);
        return;
      }
    }

    const mobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    setIsMobile(mobile);

    if (isIOS()) {
      setIsIos(true);
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop — listen for native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    // For Android/desktop where beforeinstallprompt may have already fired
    // Show the banner anyway after a delay — clicking download will check
    if (!deferredPrompt) {
      const fallbackTimer = setTimeout(() => setShowBanner(true), 4000);
      return () => clearTimeout(fallbackTimer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native install (Android / Desktop Chrome)
      setInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
      setInstalling(false);
    } else if (isMobile && !isIos) {
      // Android fallback — some browsers don't fire beforeinstallprompt
      setInstalling(true);
      // Try to trigger install by navigating to manifest
      const link = document.createElement("a");
      link.href = "/manifest.json";
      link.target = "_blank";
      // Use the native install API if available
      if ("getInstalledRelatedApps" in navigator) {
        // Check if already installed
        try {
          const apps = await (navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> }).getInstalledRelatedApps();
          if (apps.length > 0) {
            setInstalled(true);
            setShowBanner(false);
            setInstalling(false);
            return;
          }
        } catch { /* continue */ }
      }
      // Generic fallback — show instructions
      alert(
        "To download NigWrite:\n\n" +
        "1. Tap the three dots (⋮) in your browser\n" +
        '2. Tap "Add to Home Screen" or "Install App"\n' +
        "3. NigWrite will appear as a real app on your phone"
      );
      setInstalling(false);
    } else if (isIos) {
      alert(
        "To download NigWrite on iPhone/iPad:\n\n" +
        '1. Tap the Share button (square with arrow) at the bottom\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" — NigWrite will appear on your home screen'
      );
    } else {
      // Desktop fallback
      alert(
        "To download NigWrite on your computer:\n\n" +
        "1. Click the install icon (⊕) in the browser address bar\n" +
        '   OR click the three dots (⋮) → "Install NigWrite"\n' +
        "2. NigWrite will open as a standalone desktop app"
      );
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem(
      "nigwrite-install-dismissed",
      Date.now().toString()
    );
  };

  if (!showBanner || dismissed || installed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-md">
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #006B3F 0%, #004D2E 100%)",
        }}
      >
        {/* Decorative pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

        <div className="relative p-4 md:rounded-2xl md:shadow-2xl flex items-center gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/20">
              <img
                src="/icon-192.png"
                alt="NigWrite"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm md:text-base">
              Download NigWrite
            </p>
            <p className="text-white/70 text-xs md:text-sm mt-0.5">
              {isIos
                ? "Install as an app on your iPhone"
                : isMobile
                ? "Install as a real app on your phone"
                : "Install as a desktop app on your computer"}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex -space-x-0.5">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-white/50 text-[10px]">Free • No ads</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-5 py-2.5 bg-white text-[#006B3F] text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            >
              {installing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </span>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white/70 text-[10px] font-medium transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
