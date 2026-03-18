import { useState, useEffect, useCallback } from "react";
import { settingsService } from "../services/settingsService";
import { useAppStore, AppSettings } from "../store/appStore";

export function useSettings() {
  const { settings, setSettings } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const s = await settingsService.getSettings().catch((e) => {
      setError(String(e));
      return null;
    });
    if (s) setSettings(s);
    setLoading(false);
  }, [setSettings]);

  useEffect(() => {
    if (!settings) load();
  }, [settings, load]);

  const save = useCallback(
    async (s: AppSettings) => {
      setLoading(true);
      setError(null);
      await settingsService.saveSettings(s).catch((e) => {
        setError(String(e));
      });
      setSettings(s);
      setLoading(false);
    },
    [setSettings]
  );

  return { settings, loading, error, save, reload: load };
}
