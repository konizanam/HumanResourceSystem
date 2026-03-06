import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./ui/auth/AuthContext";
import { App } from "./ui/App";
import "./ui/styles.css";

// Apply stored theme before first render to avoid flash.
// Only write data-theme when the user has explicitly chosen one;
// otherwise the CSS @media (prefers-color-scheme) handles it automatically.
;(function () {
  try {
    const stored = localStorage.getItem("hrs-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch { /* ignore */ }
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
