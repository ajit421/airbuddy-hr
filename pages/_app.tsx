import "@/styles/globals.css";
import { useEffect, useRef } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Toaster } from "@/components/ui/sonner";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

// Public routes that don't require authentication — no redirect needed
const PUBLIC_ROUTES = ["/login"];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Track whether the user was previously authenticated in this session.
  // This prevents a false-positive redirect on first page load when
  // onAuthStateChanged fires with null before the session cookie is verified.
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated — record that they were logged in
        wasLoggedIn.current = true;
      } else if (wasLoggedIn.current) {
        // User WAS logged in but Firebase session has now expired/been revoked.
        // Redirect to login unless we're already on a public route.
        const isPublic = PUBLIC_ROUTES.some((p) => router.pathname.startsWith(p));
        if (!isPublic) {
          router.replace("/login");
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Component {...pageProps} />
      {/* Global toast notification system — available on every page */}
      <Toaster richColors position="top-right" />
    </>
  );
}
