import express from 'express';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config/path.js';

const router = express.Router();

// GET /api/nodes
router.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR);
        const nodes = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const content = fs.readFileSync(
                        path.join(DATA_DIR, file),
                        'utf-8'
                    );
                    return JSON.parse(content);
                } catch (err) {
                    console.error(`Error reading file ${file}:`, err);
                    return null;
                }
            })
            .filter(Boolean);

        res.json(nodes);
    } catch (err) {
        console.error('Error reading nodes directory:', err);
        res.status(500).json({ error: 'Failed to read nodes' });
    }
});

// POST /api/nodes
router.post('/', (req, res) => {
    try {
        const nodeData = req.body;

        if (!nodeData.name) {
            return res.status(400).json({ error: 'Node name is required' });
        }

        const fileName = `${nodeData.id}.json`;

        const filePath = path.join(DATA_DIR, fileName);

        fs.writeFileSync(filePath, JSON.stringify(nodeData, null, 2));
        // console.log(`Saved custom node to ${filePath}`);

        res.json({ success: true, fileName });
    } catch (err) {
        console.error('Error saving node:', err);
        res.status(500).json({ error: 'Failed to save node' });
    }
});

// DELETE /api/nodes/:id
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const fileName = `${id}.json`;
        const filePath = path.join(DATA_DIR, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            // console.log(`Deleted custom node: ${filePath}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Node not found' });
        }
    } catch (err) {
        console.error('Error deleting node:', err);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

export default router;
