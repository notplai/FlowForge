import express from 'express';
import fs from 'fs';
import path from 'path';
import { CONTAINER_DIR } from '../config/path.js';
import workflowEngine from '../engine/workflowEngine.js';

const router = express.Router();

// Helper to get file path
const getFilePath = (name, id) => path.join(CONTAINER_DIR, `${name}-${id}.json`);

// GET /api/workflows
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(CONTAINER_DIR)) {
            fs.mkdirSync(CONTAINER_DIR, { recursive: true });
        }
        const files = fs.readdirSync(CONTAINER_DIR);
        const workflows = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const content = fs.readFileSync(path.join(CONTAINER_DIR, file), 'utf-8');
                    const workflow = JSON.parse(content);

                    // Add runtime info if workflow is running
                    if (workflowEngine.isRunning(workflow.id)) {
                        const state = workflowEngine.getWorkflowState(workflow.id);
                        workflow.runtime = state;
                    }

                    return workflow;
                } catch (err) {
                    console.error(`Error reading file ${file}:`, err);
                    return null;
                }
            })
            .filter(Boolean);

        res.json(workflows);
    } catch (err) {
        console.error('Error reading workflows directory:', err);
        res.status(500).json({ error: 'Failed to read workflows' });
    }
});

// POST /api/workflows
router.post('/', (req, res) => {
    try {
        const workflow = req.body;
        if (!workflow.name || !workflow.id) {
            return res.status(400).json({ error: 'Workflow name and ID are required' });
        }

        const filePath = getFilePath(workflow.name, workflow.id);
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));

        res.json({ success: true, workflow });
    } catch (err) {
        console.error('Error saving workflow:', err);
        res.status(500).json({ error: 'Failed to save workflow' });
    }
});

// PUT /api/workflows/:id
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // console.log(`PUT /api/workflows/${id}`, updates);

        // Find existing file
        const files = fs.readdirSync(CONTAINER_DIR);
        const existingFile = files.find(f => f.endsWith(`-${id}.json`));

        if (!existingFile) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        const oldPath = path.join(CONTAINER_DIR, existingFile);
        const oldContent = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
        // const oldStatus = oldContent.status;

        const newWorkflow = { ...oldContent, ...updates };
        const newStatus = newWorkflow.status;

        // If name changed, we need to rename the file
        if (updates.name && updates.name !== oldContent.name) {
            const newPath = getFilePath(updates.name, id);
            fs.unlinkSync(oldPath);
            fs.writeFileSync(newPath, JSON.stringify(newWorkflow, null, 2));
        } else {
            fs.writeFileSync(oldPath, JSON.stringify(newWorkflow, null, 2));
        }

        // Handle workflow engine state changes - stop first if running, then start if needed
        if (newStatus === 'Offline') {
            // Always stop if status is Offline
            if (workflowEngine.isRunning(id)) {
                // console.log(`Stopping workflow ${id}`);
                workflowEngine.stopWorkflow(id);
            }
        } else if (newStatus === 'Online') {
            // Start or restart the workflow
            if (workflowEngine.isRunning(id)) {
                // console.log(`Restarting workflow ${id}`);
                workflowEngine.stopWorkflow(id);
            }
            // console.log(`Starting workflow ${id}`);
            workflowEngine.startWorkflow(id, newWorkflow);
        }

        // Add runtime info if workflow is running
        if (workflowEngine.isRunning(id)) {
            const state = workflowEngine.getWorkflowState(id);
            newWorkflow.runtime = state;
        }

        res.json({ success: true, workflow: newWorkflow });
    } catch (err) {
        console.error('Error updating workflow:', err);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

// GET /api/workflows/:id/state - Get runtime state
router.get('/:id/state', (req, res) => {
    try {
        const { id } = req.params;
        const state = workflowEngine.getWorkflowState(id);

        if (!state) {
            return res.json({ running: false });
        }

        res.json({ running: true, ...state });
    } catch (err) {
        console.error('Error getting workflow state:', err);
        res.status(500).json({ error: 'Failed to get workflow state' });
    }
});

// POST /api/workflows/:id/execute-node
router.post('/:id/execute-node', async (req, res) => {
    try {
        const { id } = req.params;
        const { nodeId, contextNodeId } = req.body;

        // Check if this function block was recently executed by the workflow engine
        // This prevents double-execution when the editor is watching
        if (workflowEngine.wasRecentlyExecuted(id, nodeId, contextNodeId)) {
            // Skip execution - already handled by the engine
            return res.json({ success: true, skipped: true });
        }

        // Find the workflow file
        const files = fs.readdirSync(CONTAINER_DIR);
        const existingFile = files.find(f => f.endsWith(`-${id}.json`));

        if (!existingFile) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        const workflow = JSON.parse(fs.readFileSync(path.join(CONTAINER_DIR, existingFile), 'utf-8'));

        // Find the node
        let node = null;
        if (contextNodeId) {
            // Search inside custom node (simplified, assumes 1 level deep for now or flat search)
            // In a real implementation, we'd need to traverse the node tree properly
            const findNode = (nodesList) => {
                for (const n of nodesList) {
                    if (String(n.id) === String(contextNodeId)) {
                        if (n.internalNodes) {
                            return n.internalNodes.find(inNode => String(inNode.id) === String(nodeId));
                        }
                    }
                    if (n.type === 'custom' && n.internalNodes) {
                        const found = findNode(n.internalNodes);
                        if (found) return found;
                    }
                }
                return null;
            };
            node = findNode(workflow.nodes);
        } else {
            node = workflow.nodes.find(n => String(n.id) === String(nodeId));
        }

        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        if (node.type !== 'functionBlock') {
            return res.status(400).json({ error: 'Node is not a function block' });
        }

        // Execute the code using the workflow engine's execution method
        // This ensures console output is sent to the browser via WebSocket

        const isSync = node.synchronize !== false;

        if (!isSync) {
            // Async mode: Respond immediately, then execute in background
            res.json({ success: true, async: true });

            // Execute in background using workflow engine
            workflowEngine.executeFunctionBlockCode(node, id).catch(err => {
                // Error already broadcasted by executeFunctionBlockCode
            });
            return;
        }

        try {
            // Synchronous execution using workflow engine
            await workflowEngine.executeFunctionBlockCode(node, id);
            res.json({ success: true });
        } catch (execErr) {
            // Error already broadcasted by executeFunctionBlockCode
            res.status(500).json({ error: execErr.message });
        }

    } catch (err) {
        console.error('Error executing node:', err);
        res.status(500).json({ error: 'Failed to execute node' });
    }
});

// DELETE /api/workflows/:id
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Stop workflow if running
        if (workflowEngine.isRunning(id)) {
            workflowEngine.stopWorkflow(id);
        }

        const files = fs.readdirSync(CONTAINER_DIR);
        const existingFile = files.find(f => f.endsWith(`-${id}.json`));

        if (!existingFile) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        fs.unlinkSync(path.join(CONTAINER_DIR, existingFile));
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting workflow:', err);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});

export default router;
