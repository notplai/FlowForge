import express from 'express';
import path from 'path';
import fs from 'fs';
import { CONFIG_DIR } from '../config/path.js';
import { readJSON, writeJSON } from '../utils/fs.js';

const router = express.Router();
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
    theme: 'light',
    keybinds: {
        toolMenu: 'Alt',
        save: 'Ctrl+S',
        undo: 'Ctrl+Z',
        redo: 'Ctrl+Y',
        escape: 'Escape'
    },
    systemSettings: {
        engine: 'json'
    }
};

// Get settings
router.get('/', (req, res) => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const settings = readJSON(SETTINGS_FILE);
            // Merge with defaults to ensure all keys exist
            res.json({ ...DEFAULT_SETTINGS, ...settings });
        } else {
            // If no settings file, return defaults
            res.json(DEFAULT_SETTINGS);
        }
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// Save settings
router.post('/', (req, res) => {
    try {
        const newSettings = req.body;
        // Merge with existing settings to ensure we don't lose keys if partial update
        let currentSettings = DEFAULT_SETTINGS;
        if (fs.existsSync(SETTINGS_FILE)) {
            currentSettings = readJSON(SETTINGS_FILE);
        }

        const updatedSettings = { ...currentSettings, ...newSettings };
        writeJSON(SETTINGS_FILE, updatedSettings);
        res.json({ success: true, settings: updatedSettings });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

export default router;
