"use client";

import { useEffect } from "react";

/** Registers a cache that contains only the public application shell. */
export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // A PWA enhancement must never interrupt authentication or private pages.
    });
  }, []);

  return null;
}
