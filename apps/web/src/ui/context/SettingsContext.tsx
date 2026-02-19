import React, { createContext, useContext, useEffect, useState } from "react";
import { getSettings } from "../api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SystemSettings = {
  system_name: string;
  system_logo_url: string;
  primary_color: string;
  company_name: string;
  support_email: string;
};

const DEFAULTS: SystemSettings = {
  system_name: "HR System",
  system_logo_url: "",
  primary_color: "#4f46e5",
  company_name: "",
  support_email: "",
};

const SettingsContext = createContext<SystemSettings>(DEFAULTS);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);

  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {
        // Settings API not available yet – use defaults
      });
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSettings() {
  return useContext(SettingsContext);
}
