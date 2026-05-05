"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistration — Registers the service worker on mount.
 * Must be a client component since it accesses `window` / `navigator`.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register the service worker after the page has fully loaded
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates periodically (every 30 min)
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        console.log("[NigWrite] Service Worker registered:", registration.scope);
      } catch (error) {
        console.warn("[NigWrite] Service Worker registration failed:", error);
      }
    };

    // Wait for the page to be fully loaded before registering
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    return () => {
      window.removeEventListener("load", registerSW);
    };
  }, []);

  return null; // This component renders nothing
}
