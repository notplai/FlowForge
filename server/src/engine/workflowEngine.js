// Workflow Engine - Manages running workflows in the background
// Implements topological execution order with synchronous propagation
// Each workflow runs in its own isolated instance

import WorkflowInstance from './WorkflowInstance.js';

class WorkflowEngine {
    constructor() {
        this.workflowInstances = new Map(); // Map of workflowId -> WorkflowInstance
        this.intervals = new Map(); // Map of workflowId -> interval IDs
        this.logBroadcaster = null; // Function to broadcast logs to WebSocket clients
    }

    // Check if a function block was recently executed by the engine
    wasRecentlyExecuted(workflowId, nodeId, contextNodeId = null) {
        const instance = this.workflowInstances.get(String(workflowId));
        if (!instance) return false;
        return instance.wasRecentlyExecuted(nodeId, contextNodeId);
    }

    // Mark a function block as recently executed
    markAsExecuted(workflowId, nodeId, contextNodeId = null) {
        const instance = this.workflowInstances.get(String(workflowId));
        if (instance) {
            instance.markAsExecuted(nodeId, contextNodeId);
        }
    }

    // Set the log broadcaster function (called from main.js)
    setLogBroadcaster(broadcaster) {
        this.logBroadcaster = broadcaster;
    }

    // Broadcast a log message to connected clients
    broadcastLog(level, nodeId, workflowId, ...args) {
        if (this.logBroadcaster) {
            this.logBroadcaster({
                type: 'console',
                level,
                nodeId,
                workflowId,
                timestamp: Date.now(),
                message: args.map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ')
            });
        }
    }

    // Start a workflow
    startWorkflow(workflowId, workflowData) {
        const id = String(workflowId);
        if (this.workflowInstances.has(id)) {
            // console.log(`Workflow ${id} is already running`);
            return;
        }

        // console.log(`Starting workflow: ${id}`);

        // Create isolated workflow instance
        const instance = new WorkflowInstance(id, workflowData, this.logBroadcaster);

        // Store the instance
        this.workflowInstances.set(id, instance);

        // Start instance background processing
        instance.startBackgroundProcessing();

        // Initialize and execute workflow in topological order
        this.initializeWorkflow(id, instance);

        // Start engine-level background processing (if needed)
        this.startBackgroundProcessing(id, instance);
    }

    // Initialize workflow - find entry points and build execution order
    initializeWorkflow(workflowId, workflowState) {
        // console.log(`Initializing workflow ${workflowId} in topological order...`);

        // Find all entry points (nodes that start execution)
        const entryNodes = this.findEntryNodes(workflowState.nodes, workflowState.connections);

        // Sort entry nodes by Y position (top first)
        entryNodes.sort((a, b) => (a.y || 0) - (b.y || 0));

        // console.log(`Found ${entryNodes.length} entry nodes:`, entryNodes.map(n => `${n.type}:${n.id}`));

        // Execute entry nodes in order (OnStart nodes trigger immediately)
        this.executeEntryNodesSequentially(workflowId, workflowState, entryNodes, 0);
    }

    // Find entry point nodes: OnStart, OnClick, Input, or nodes with no input connections
    findEntryNodes(nodes, connections, contextNodeId = null) {
        const entryNodes = [];
        const nodesWithInputs = new Set();

        // Track which nodes have incoming connections
        connections.forEach(conn => {
            nodesWithInputs.add(String(conn.to));
        });

        nodes.forEach(node => {
            if (node.disabled) return;

            // Priority 1: OnStart nodes (auto-trigger)
            if (node.type === 'onStart') {
                entryNodes.push({ ...node, _priority: 1, _contextNodeId: contextNodeId });
            }
            // Priority 2: OnClick nodes (manual trigger, but still entry points)
            else if (node.type === 'onClick') {
                entryNodes.push({ ...node, _priority: 2, _contextNodeId: contextNodeId });
            }
            // Priority 3: Input nodes (for custom nodes)
            else if (node.type === 'input') {
                entryNodes.push({ ...node, _priority: 3, _contextNodeId: contextNodeId });
            }
            // Priority 4: Nodes with no input connections
            else if (!nodesWithInputs.has(String(node.id))) {
                // Check if node has input ports but no connections
                const hasInputPort = !['onStart', 'onClick', 'input'].includes(node.type);
                if (hasInputPort) {
                    // This node has input capability but nothing connected - could be orphaned
                    // Only include if it has output connections (otherwise it's truly isolated)
                    const hasOutputConnections = connections.some(c => String(c.from) === String(node.id));
                    if (hasOutputConnections) {
                        entryNodes.push({ ...node, _priority: 4, _contextNodeId: contextNodeId });
                    }
                }
            }
        });

        // Sort by priority then by Y position
        entryNodes.sort((a, b) => {
            if (a._priority !== b._priority) return a._priority - b._priority;
            return (a.y || 0) - (b.y || 0);
        });

        return entryNodes;
    }

    // Execute entry nodes sequentially
    async executeEntryNodesSequentially(workflowId, workflowState, entryNodes, index) {
        if (!this.workflowInstances.has(workflowId)) return;
        if (index >= entryNodes.length) {
            // console.log(`All entry nodes initialized for workflow ${workflowId}`);
            return;
        }

        const node = entryNodes[index];
        const nodeKey = node._contextNodeId ? `${node._contextNodeId}-${node.id}` : String(node.id);

        // Mark as initialized
        workflowState.initializedNodes.add(nodeKey);

        // console.log(`Initializing entry node ${index + 1}/${entryNodes.length}: ${node.type}:${node.id}`);

        // OnStart nodes trigger immediately
        if (node.type === 'onStart' && !workflowState.triggeredOnStart.has(nodeKey)) {
            workflowState.triggeredOnStart.add(nodeKey);
            // console.log(`Triggered onStart node: ${nodeKey}`);

            // Execute the signal chain synchronously
            await this.executeSignalChain(workflowId, workflowState, node.id, node._contextNodeId);
        }

        // Move to next entry node
        // Small delay to allow visual feedback
        setTimeout(() => {
            this.executeEntryNodesSequentially(workflowId, workflowState, entryNodes, index + 1);
        }, 50);
    }

    // Execute signal chain synchronously - follows wires and waits for each node
    async executeSignalChain(workflowId, workflowState, fromNodeId, contextNodeId = null) {
        if (!this.workflowInstances.has(workflowId)) return;

        // Update activity
        workflowState.updateActivity();

        // Get connections for this context
        const connections = contextNodeId
            ? (this.findNodeById(workflowState.nodes, contextNodeId)?.internalConnections || [])
            : workflowState.connections;

        const nodesList = contextNodeId
            ? (this.findNodeById(workflowState.nodes, contextNodeId)?.internalNodes || [])
            : workflowState.nodes;

        // Find all outgoing connections from this node
        const outgoingConnections = connections.filter(conn => String(conn.from) === String(fromNodeId));

        if (outgoingConnections.length === 0) {
            // console.log(`Node ${fromNodeId} has no outgoing connections - end of chain`);
            return;
        }

        // Sort by target node's Y position (execute top nodes first)
        outgoingConnections.sort((a, b) => {
            const nodeA = nodesList.find(n => String(n.id) === String(a.to));
            const nodeB = nodesList.find(n => String(n.id) === String(b.to));
            return ((nodeA?.y || 0) - (nodeB?.y || 0));
        });

        // Execute each connection sequentially
        for (const conn of outgoingConnections) {
            if (!this.workflowInstances.has(workflowId)) return;

            const connId = conn.id || `${conn.from}-${conn.to}`;

            // Create visual signal
            const signal = {
                id: Date.now() + Math.random(),
                connectionId: connId,
                from: conn.from,
                to: conn.to,
                timestamp: Date.now(),
                contextNodeId,
                progress: 0
            };

            workflowState.activeSignals.push(signal);
            // console.log(`Signal propagating: ${conn.from} -> ${conn.to}`);

            // Find target node
            const targetNode = nodesList.find(n => String(n.id) === String(conn.to));

            if (!targetNode || targetNode.disabled) {
                // Remove signal and skip
                const index = workflowState.activeSignals.findIndex(s => s.id === signal.id);
                if (index !== -1) workflowState.activeSignals.splice(index, 1);
                continue;
            }

            // Wait for signal travel animation (1 second)
            await this.delay(1000);

            // Remove signal from active
            const index = workflowState.activeSignals.findIndex(s => s.id === signal.id);
            if (index !== -1) workflowState.activeSignals.splice(index, 1);

            // Process target node and wait for completion
            await this.processNodeSync(workflowId, workflowState, targetNode, contextNodeId, conn);
        }
    }

    // Process a node synchronously and wait for completion
    async processNodeSync(workflowId, workflowState, node, contextNodeId = null, incomingConnection = null) {
        if (!this.workflowInstances.has(workflowId)) return;

        // console.log(`Processing node: ${node.id} (type: ${node.type})`);

        // Update activity
        workflowState.updateActivity();
        if (workflowState.status === 'Idling') {
            workflowState.status = 'Online';
        }

        // Handle different node types
        switch (node.type) {
            case 'sleep':
            case 'delay': {
                const delayTime = node.sleepTime || node.data?.delay || 1000;
                // console.log(`${node.type} node ${node.id} waiting for ${delayTime}ms`);

                // Track processing
                const processing = {
                    id: Date.now() + Math.random(),
                    nodeId: node.id,
                    type: node.type,
                    startTime: Date.now(),
                    duration: delayTime,
                    contextNodeId
                };
                workflowState.processingNodes.push(processing);

                // Wait for delay
                await this.delay(delayTime);

                // Remove from processing
                const idx = workflowState.processingNodes.findIndex(p => p.id === processing.id);
                if (idx !== -1) workflowState.processingNodes.splice(idx, 1);

                // Continue chain
                await this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                break;
            }

            case 'custom': {
                // Enter custom node - execute its internal graph
                if (node.internalNodes && node.internalConnections) {
                    // console.log(`Entering custom node ${node.id}`);

                    // Find the input node that corresponds to the incoming connection's targetHandle
                    let internalInputNode = null;
                    if (incomingConnection?.targetHandle) {
                        internalInputNode = node.internalNodes.find(n => String(n.id) === String(incomingConnection.targetHandle));
                    }
                    // Fallback: find first input node
                    if (!internalInputNode) {
                        internalInputNode = node.internalNodes.find(n => n.type === 'input');
                    }

                    if (internalInputNode) {
                        // Execute from the internal input node
                        await this.executeSignalChain(workflowId, workflowState, internalInputNode.id, node.id);
                    } else {
                        // No input node, try to find and trigger onStart nodes inside
                        const internalEntryNodes = this.findEntryNodes(node.internalNodes, node.internalConnections || [], node.id);
                        for (const entryNode of internalEntryNodes) {
                            if (entryNode.type === 'onStart') {
                                const nodeKey = `${node.id}-${entryNode.id}`;
                                if (!workflowState.triggeredOnStart.has(nodeKey)) {
                                    workflowState.triggeredOnStart.add(nodeKey);
                                    await this.executeSignalChain(workflowId, workflowState, entryNode.id, node.id);
                                }
                            }
                        }
                    }
                }
                // Custom nodes don't auto-propagate - output nodes handle that
                break;
            }

            case 'output': {
                // Exiting a custom node
                if (contextNodeId) {
                    // console.log(`Output node ${node.id} reached in context ${contextNodeId}`);

                    // Find parent context
                    const parentContext = this.findParentContext(workflowState.nodes, contextNodeId);

                    if (parentContext) {
                        // Inside a nested custom node - propagate to parent's connections
                        const parentConnections = parentContext.internalConnections || [];
                        const outgoing = parentConnections.filter(c =>
                            String(c.from) === String(contextNodeId) &&
                            String(c.sourceHandle) === String(node.id)
                        );

                        for (const conn of outgoing) {
                            const targetNode = parentContext.internalNodes?.find(n => String(n.id) === String(conn.to));
                            if (targetNode && !targetNode.disabled) {
                                // Create signal and propagate
                                const signal = {
                                    id: Date.now() + Math.random(),
                                    connectionId: conn.id || `${conn.from}-${conn.to}`,
                                    from: conn.from,
                                    to: conn.to,
                                    timestamp: Date.now(),
                                    contextNodeId: parentContext.id,
                                    progress: 0
                                };
                                workflowState.activeSignals.push(signal);

                                await this.delay(1000);

                                const idx = workflowState.activeSignals.findIndex(s => s.id === signal.id);
                                if (idx !== -1) workflowState.activeSignals.splice(idx, 1);

                                await this.processNodeSync(workflowId, workflowState, targetNode, parentContext.id, conn);
                            }
                        }
                    } else {
                        // Top-level custom node - propagate to global connections
                        const outgoing = workflowState.connections.filter(c =>
                            String(c.from) === String(contextNodeId) &&
                            String(c.sourceHandle) === String(node.id)
                        );

                        for (const conn of outgoing) {
                            const targetNode = workflowState.nodes.find(n => String(n.id) === String(conn.to));
                            if (targetNode && !targetNode.disabled) {
                                const signal = {
                                    id: Date.now() + Math.random(),
                                    connectionId: conn.id || `${conn.from}-${conn.to}`,
                                    from: conn.from,
                                    to: conn.to,
                                    timestamp: Date.now(),
                                    contextNodeId: null,
                                    progress: 0
                                };
                                workflowState.activeSignals.push(signal);

                                await this.delay(1000);

                                const idx = workflowState.activeSignals.findIndex(s => s.id === signal.id);
                                if (idx !== -1) workflowState.activeSignals.splice(idx, 1);

                                await this.processNodeSync(workflowId, workflowState, targetNode, null, conn);
                            }
                        }
                    }
                }
                break;
            }

            case 'functionBlock': {
                // Mark as executed by engine to prevent double-execution from frontend API
                this.markAsExecuted(workflowId, node.id, contextNodeId);

                // Execute the function block code
                const isSync = node.synchronize !== false;

                if (isSync) {
                    // Synchronous: wait for execution to complete before continuing
                    try {
                        await this.executeFunctionBlockCode(node, workflowId);
                    } catch (err) {
                        // Error already broadcasted by executeFunctionBlockCode
                    }
                } else {
                    // Async: execute in background, don't wait
                    this.executeFunctionBlockCode(node, workflowId).catch(() => {
                        // Error already broadcasted by executeFunctionBlockCode
                    });
                }

                // Continue signal chain
                await this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                break;
            }

            case 'not': {
                // NOT node logic - inverts signal (handled by signal timing)
                // Just propagate for backend tracking
                await this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                break;
            }

            case 'or': {
                // OR gate - propagate when any input arrives
                await this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                break;
            }

            default: {
                // Standard nodes - propagate immediately
                // Small delay for visual effect
                await this.delay(100);
                await this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                break;
            }
        }
    }

    // Helper: Find node by ID recursively
    findNodeById(nodes, nodeId) {
        for (const node of nodes) {
            if (String(node.id) === String(nodeId)) return node;
            if (node.type === 'custom' && node.internalNodes) {
                const found = this.findNodeById(node.internalNodes, nodeId);
                if (found) return found;
            }
        }
        return null;
    }

    // Helper: Find parent context of a node
    findParentContext(nodes, childId, parent = null) {
        for (const node of nodes) {
            if (String(node.id) === String(childId)) return parent;
            if (node.type === 'custom' && node.internalNodes) {
                const found = this.findParentContext(node.internalNodes, childId, node);
                if (found !== undefined) return found;
            }
        }
        return undefined;
    }

    // Helper: Async delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Execute Function Block code (JavaScript or Python)
    async executeFunctionBlockCode(node, workflowId) {
        const code = node.code || '';
        const language = node.language || 'javascript';

        if (!code.trim()) {
            return;
        }

        // Get the workflow instance for isolated execution
        const instance = this.workflowInstances.get(String(workflowId));

        if (instance) {
            // Use the instance's isolated VM context
            try {
                await instance.executeCode(code, node.id, language);
            } catch (err) {
                // Error already broadcasted by instance
                throw err;
            }
        } else {
            // Fallback: execute without isolation (for API calls without running workflow)
            if (language === 'javascript') {
                const self = this;
                const context = {
                    console: {
                        log: (...args) => self.broadcastLog('log', node.id, workflowId, ...args),
                        info: (...args) => self.broadcastLog('info', node.id, workflowId, ...args),
                        warn: (...args) => self.broadcastLog('warn', node.id, workflowId, ...args),
                        error: (...args) => self.broadcastLog('error', node.id, workflowId, ...args),
                        debug: (...args) => self.broadcastLog('debug', node.id, workflowId, ...args),
                    },
                    setTimeout,
                    setInterval,
                    clearTimeout,
                    clearInterval,
                    Promise,
                    Date,
                    Math,
                    JSON,
                };

                const isAsyncCode = /\bawait\b/.test(code) || /\basync\b/.test(code);

                try {
                    if (isAsyncCode) {
                        const asyncFunc = new Function('context', `
                            return (async () => {
                                const { console, setTimeout, setInterval, clearTimeout, clearInterval, Promise, Date, Math, JSON } = context;
                                ${code}
                            })();
                        `);
                        await asyncFunc(context);
                    } else {
                        const func = new Function('context', `
                            const { console, setTimeout, setInterval, clearTimeout, clearInterval, Promise, Date, Math, JSON } = context;
                            ${code}
                        `);
                        func(context);
                    }
                } catch (err) {
                    this.broadcastLog('error', node.id, workflowId, `Execution error: ${err.message}`);
                    throw err;
                }
            } else if (language === 'python') {
                this.broadcastLog('warn', node.id, workflowId, 'Python execution not yet implemented');
            } else {
                this.broadcastLog('warn', node.id, workflowId, `Unknown language: ${language}`);
            }
        }
    }

    // Stop a workflow
    stopWorkflow(workflowId) {
        const id = String(workflowId);
        const instance = this.workflowInstances.get(id);
        if (!instance) {
            // console.log(`Workflow ${id} is not running`);
            return;
        }

        // console.log(`Stopping workflow: ${id}`);

        // Stop the instance (cleans up intervals, timeouts, etc.)
        instance.stop();

        // Clear any engine-level intervals
        if (this.intervals.has(id)) {
            clearInterval(this.intervals.get(id));
            this.intervals.delete(id);
        }

        // Remove from workflow instances
        this.workflowInstances.delete(id);
    }

    // Legacy: Trigger onStart nodes (now handled by initializeWorkflow)
    triggerOnStartNodes(workflowId, workflowState) {
        // This is now handled by initializeWorkflow for better ordering
        // Kept for API compatibility - triggers async execution
        const triggerRecursive = (nodesList, contextNodeId = null) => {
            nodesList.forEach(node => {
                const nodeKey = contextNodeId ? `${contextNodeId}-${node.id}` : node.id;

                if (node.type === 'onStart' && !node.disabled && !workflowState.triggeredOnStart.has(nodeKey)) {
                    workflowState.triggeredOnStart.add(nodeKey);
                    // console.log(`Triggered onStart node: ${nodeKey} in workflow ${workflowId}`);
                    this.executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
                }

                // Check nested custom nodes
                if (node.type === 'custom' && !node.disabled && node.internalNodes) {
                    triggerRecursive(node.internalNodes, node.id);
                }
            });
        };

        triggerRecursive(workflowState.nodes);
    }

    // Legacy: Propagate signal (now uses executeSignalChain for sync execution)
    propagateSignal(workflowId, workflowState, fromNodeId, contextNodeId = null) {
        // Trigger async signal chain for manual triggers (onClick, etc.)
        this.executeSignalChain(workflowId, workflowState, fromNodeId, contextNodeId);
    }

    // Legacy: Process a node (now uses processNodeSync)
    processNode(workflowId, workflowState, node, contextNodeId = null) {
        this.processNodeSync(workflowId, workflowState, node, contextNodeId);
    }

    // Start background processing for a workflow (engine-level monitoring)
    startBackgroundProcessing(workflowId, workflowState) {
        // Engine-level background processing is minimal now
        // Most processing is done by the WorkflowInstance itself
        // This interval is just for additional monitoring if needed
        const interval = setInterval(() => {
            if (!this.workflowInstances.has(workflowId)) {
                clearInterval(interval);
                this.intervals.delete(workflowId);
            }
        }, 5000);

        this.intervals.set(workflowId, interval);
    }

    // Get workflow state
    getWorkflowState(workflowId) {
        const id = String(workflowId);
        const instance = this.workflowInstances.get(id);
        if (!instance) return null;

        // Delegate to instance's getState method
        return instance.getState();
    }

    // Get all running workflows
    getAllRunningWorkflows() {
        return Array.from(this.workflowInstances.keys());
    }

    // Check if workflow is running
    isRunning(workflowId) {
        const id = String(workflowId);
        return this.workflowInstances.has(id);
    }

    // Restart workflow (stop and start)
    restartWorkflow(workflowId, workflowData) {
        this.stopWorkflow(workflowId);
        this.startWorkflow(workflowId, workflowData);
    }

    // Handle onClick trigger from frontend
    triggerOnClick(workflowId, nodeId, contextNodeId = null) {
        const id = String(workflowId);
        const instance = this.workflowInstances.get(id);
        if (!instance) return;

        // const nodeKey = contextNodeId ? `${contextNodeId}-${nodeId}` : String(nodeId);
        // console.log(`OnClick triggered: ${nodeKey}`);

        // Execute the signal chain
        this.executeSignalChain(workflowId, instance, nodeId, contextNodeId);
    }

    // Graceful shutdown: Stop all running workflows and update their state to offline
    async shutdown() {
        console.log('Shutting down workflow engine...');

        const runningIds = Array.from(this.workflowInstances.keys());
        console.log(`Stopping ${runningIds.length} running workflow(s)...`);

        // Import fs and path for updating workflow files
        const fs = await import('fs');
        const path = await import('path');
        const { CONTAINER_DIR } = await import('../config/path.js');

        // Stop all workflows and update their status to offline
        for (const workflowId of runningIds) {
            try {
                // Stop the workflow instance
                this.stopWorkflow(workflowId);

                // Update the workflow file to set status to Offline
                const files = fs.default.readdirSync(CONTAINER_DIR);
                const existingFile = files.find(f => f.endsWith(`-${workflowId}.json`));

                if (existingFile) {
                    const filePath = path.default.join(CONTAINER_DIR, existingFile);
                    const workflow = JSON.parse(fs.default.readFileSync(filePath, 'utf-8'));

                    // Set status to Offline
                    workflow.status = 'Offline';

                    // Remove runtime information
                    delete workflow.runtime;

                    // Save the updated workflow
                    fs.default.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
                    console.log(`✓ Workflow "${workflow.name}" (${workflowId}) set to Offline`);
                }
            } catch (err) {
                console.error(`Failed to stop workflow ${workflowId}:`, err.message);
            }
        }

        // Clear all tracking
        this.workflowInstances.clear();
        this.intervals.clear();

        console.log('Workflow engine shutdown complete');
    }
}

// Singleton instance
const workflowEngine = new WorkflowEngine();

export default workflowEngine;
