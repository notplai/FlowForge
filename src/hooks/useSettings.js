import { useState, useEffect, useCallback } from 'react';
import { settingsAPI } from '../utils/api';

const DEFAULT_KEYBINDS = {
    toolMenu: 'Alt',
    save: 'Ctrl+S',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    escape: 'Escape'
};

const DEFAULT_SYSTEM_SETTINGS = {
    engine: 'json'
};

export function useSettings() {
    const [theme, setTheme] = useState('light');
    const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
    const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async (useCache = true) => {
        try {
            setLoading(true);
            const data = await settingsAPI.get(useCache);

            if (data.theme) setTheme(data.theme);
            if (data.keybinds) setKeybinds({ ...DEFAULT_KEYBINDS, ...data.keybinds });
            if (data.systemSettings) {
                setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...data.systemSettings });
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (updates) => {
        try {
            // Use functional updates to get current state
            let currentTheme, currentKeybinds, currentSystemSettings;

            setTheme(prev => {
                currentTheme = prev;
                return updates.theme !== undefined ? updates.theme : prev;
            });

            setKeybinds(prev => {
                currentKeybinds = prev;
                return updates.keybinds !== undefined ? updates.keybinds : prev;
            });

            setSystemSettings(prev => {
                currentSystemSettings = prev;
                return updates.systemSettings !== undefined ? updates.systemSettings : prev;
            });

            const newSettings = {
                theme: updates.theme ?? currentTheme,
                keybinds: updates.keybinds ?? currentKeybinds,
                systemSettings: updates.systemSettings ?? currentSystemSettings
            };

            await settingsAPI.update(newSettings);
        } catch (err) {
            console.error('Failed to update settings:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    return {
        theme,
        keybinds,
        systemSettings,
        loading,
        setTheme: (newTheme) => updateSettings({ theme: newTheme }),
        setKeybinds: (newKeybinds) => updateSettings({ keybinds: newKeybinds }),
        setSystemSettings: (newSettings) => updateSettings({ systemSettings: newSettings }),
        refresh: fetchSettings
    };
}
