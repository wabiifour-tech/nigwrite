"use client";

import { useState, useEffect } from "react";

/**
 * PWAInstallPrompt — Shows an "Install App" banner when the browser
 * supports the BeforeInstallPromptEvent (Android / Desktop Chrome/Edge).
 *
 * On iOS Safari there is no such event, so we show a manual instruction
 * banner instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
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
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already installed / standalone
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Check if previously dismissed (within 7 days)
    const dismissedAt = localStorage.getItem("nigwrite-install-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Detect iOS
    if (isIOS()) {
      setIsIos(true);
      // Show iOS banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt (Chrome / Edge on Android & Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
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
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
          <img
            src="/icon-192.png"
            alt="NigWrite"
            className="w-10 h-10 rounded-lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            Install NigWrite
          </p>
          {!isIos ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add to your home screen for quick access &amp; offline support.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tap{" "}
              <span className="inline-flex items-center gap-0.5 font-medium">
                <ShareIcon className="w-3 h-3" />
                Share
              </span>{" "}
              then <span className="font-medium">&quot;Add to Home Screen&quot;</span>
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {!isIos && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Install App
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}
