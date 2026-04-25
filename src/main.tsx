import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Preload critical resources
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = import.meta.env.VITE_CONVEX_URL;
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
