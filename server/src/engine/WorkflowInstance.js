import vm from 'vm';

/**
 * WorkflowInstance - Isolated execution context for a single workflow
 * Each workflow gets its own VM context with isolated globals
 */
class WorkflowInstance {
    constructor(workflowId, workflowData, logBroadcaster) {
        this.id = String(workflowId);
        this.name = workflowData.name;
        this.logBroadcaster = logBroadcaster;

        // Workflow state
        this.status = 'Online';
        this.startTime = Date.now();
        this.lastActivityTime = Date.now();
        this.idleTimeout = workflowData.idleTimeout !== undefined ? workflowData.idleTimeout : 15000;

        // Execution state
        this.activeSignals = [];
        this.processingNodes = [];
        this.triggeredOnStart = new Set();
        this.initializedNodes = new Set();
        this.executionQueue = [];

        // Workflow definition
        this.nodes = workflowData.nodes || [];
        this.connections = workflowData.connections || [];

        // Track recently executed function blocks (for preventing double-execution)
        this.recentlyExecutedBlocks = new Map();

        // Isolated storage for this workflow instance
        this.storage = new Map();

        // Track intervals/timeouts created by function blocks
        this.activeIntervals = new Set();
        this.activeTimeouts = new Set();

        // Background processing interval
        this.backgroundInterval = null;

        // Create isolated VM context for this workflow
        this.vmContext = this.createVMContext();
    }

    /**
     * Create an isolated VM context for this workflow
     */
    createVMContext() {
        const self = this;

        // Create sandboxed globals
        const sandbox = {
            // Workflow-scoped storage
            workflowStorage: this.storage,

            // Safe built-ins
            console: {
                log: (...args) => self.broadcastLog('log', 'workflow', ...args),
                info: (...args) => self.broadcastLog('info', 'workflow', ...args),
                warn: (...args) => self.broadcastLog('warn', 'workflow', ...args),
                error: (...args) => self.broadcastLog('error', 'workflow', ...args),
                debug: (...args) => self.broadcastLog('debug', 'workflow', ...args),
            },

            // Wrapped setTimeout/setInterval that track handles
            setTimeout: (fn, delay, ...args) => {
                const handle = setTimeout(() => {
                    self.activeTimeouts.delete(handle);
                    try {
                        fn(...args);
                    } catch (err) {
                        self.broadcastLog('error', 'workflow', `Timeout error: ${err.message}`);
                    }
                }, delay);
                self.activeTimeouts.add(handle);
                return handle;
            },

            setInterval: (fn, delay, ...args) => {
                const handle = setInterval(() => {
                    try {
                        fn(...args);
                    } catch (err) {
                        self.broadcastLog('error', 'workflow', `Interval error: ${err.message}`);
                    }
                }, delay);
                self.activeIntervals.add(handle);
                return handle;
            },

            clearTimeout: (handle) => {
                self.activeTimeouts.delete(handle);
                clearTimeout(handle);
            },

            clearInterval: (handle) => {
                self.activeIntervals.delete(handle);
                clearInterval(handle);
            },

            // Safe globals
            Promise,
            Date,
            Math,
            JSON,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Map,
            Set,
            RegExp,
            Error,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            encodeURI,
            decodeURI,
            encodeURIComponent,
            decodeURIComponent,
        };

        // Create VM context
        return vm.createContext(sandbox, {
            name: `Workflow-${this.id}`,
            origin: `workflow://${this.id}`,
        });
    }

    /**
     * Broadcast a log message
     */
    broadcastLog(level, nodeId, ...args) {
        if (this.logBroadcaster) {
            this.logBroadcaster({
                type: 'console',
                level,
                nodeId,
                workflowId: this.id,
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

    /**
     * Check if a function block was recently executed
     */
    wasRecentlyExecuted(nodeId, contextNodeId = null) {
        const key = contextNodeId ? `${contextNodeId}-${nodeId}` : String(nodeId);
        return this.recentlyExecutedBlocks.has(key);
    }

    /**
     * Mark a function block as recently executed
     */
    markAsExecuted(nodeId, contextNodeId = null) {
        const key = contextNodeId ? `${contextNodeId}-${nodeId}` : String(nodeId);
        this.recentlyExecutedBlocks.set(key, Date.now());
        // Clear after 500ms to allow re-execution in next wave
        setTimeout(() => {
            this.recentlyExecutedBlocks.delete(key);
        }, 500);
    }

    /**
     * Execute code in the isolated VM context
     */
    async executeCode(code, nodeId, language = 'javascript') {
        if (!code.trim()) {
            return;
        }

        if (language !== 'javascript') {
            this.broadcastLog('warn', nodeId, `Language "${language}" not yet supported`);
            return;
        }

        // Create node-specific console
        const self = this;
        const nodeConsole = {
            log: (...args) => self.broadcastLog('log', nodeId, ...args),
            info: (...args) => self.broadcastLog('info', nodeId, ...args),
            warn: (...args) => self.broadcastLog('warn', nodeId, ...args),
            error: (...args) => self.broadcastLog('error', nodeId, ...args),
            debug: (...args) => self.broadcastLog('debug', nodeId, ...args),
        };

        // Update console in context for this execution
        this.vmContext.console = nodeConsole;

        // Check if code contains async/await
        const isAsyncCode = /\bawait\b/.test(code) || /\basync\b/.test(code);

        try {
            if (isAsyncCode) {
                // Wrap in async IIFE
                const wrappedCode = `(async () => { ${code} })()`;
                const script = new vm.Script(wrappedCode, {
                    filename: `node-${nodeId}.js`,
                    timeout: 30000, // 30 second timeout
                });
                await script.runInContext(this.vmContext);
            } else {
                const script = new vm.Script(code, {
                    filename: `node-${nodeId}.js`,
                    timeout: 30000, // 30 second timeout
                });
                script.runInContext(this.vmContext);
            }
        } catch (err) {
            this.broadcastLog('error', nodeId, `Execution error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Update activity timestamp
     */
    updateActivity() {
        this.lastActivityTime = Date.now();
        if (this.status === 'Idling') {
            this.status = 'Online';
        }
    }

    /**
     * Start background processing
     */
    startBackgroundProcessing() {
        this.backgroundInterval = setInterval(() => {
            const now = Date.now();

            // Check for idling
            if (this.idleTimeout > 0 &&
                this.status === 'Online' &&
                now - this.lastActivityTime > this.idleTimeout) {
                this.status = 'Idling';
            }

            // Cleanup old signals (older than 10 seconds)
            this.activeSignals = this.activeSignals.filter(
                signal => now - signal.timestamp < 10000
            );
        }, 1000);
    }

    /**
     * Stop the workflow instance and cleanup
     */
    stop() {
        // Clear background processing
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }

        // Clear all intervals created by function blocks
        for (const handle of this.activeIntervals) {
            clearInterval(handle);
        }
        this.activeIntervals.clear();

        // Clear all timeouts created by function blocks
        for (const handle of this.activeTimeouts) {
            clearTimeout(handle);
        }
        this.activeTimeouts.clear();

        // Clear storage
        this.storage.clear();

        // Clear execution tracking
        this.recentlyExecutedBlocks.clear();

        this.status = 'Offline';
    }

    /**
     * Get current state for API responses
     */
    getState() {
        const now = Date.now();
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            startTime: this.startTime,
            uptime: now - this.startTime,
            activeSignals: this.activeSignals.length,
            processingNodesCount: this.processingNodes.length,
            triggeredOnStart: Array.from(this.triggeredOnStart),
            initializedNodes: Array.from(this.initializedNodes),
            signals: this.activeSignals.map(s => ({
                id: s.id,
                connectionId: s.connectionId,
                from: s.from,
                to: s.to,
                contextNodeId: s.contextNodeId,
                progress: Math.min(1, (now - s.timestamp) / 1000)
            })),
            processingNodes: this.processingNodes.map(p => ({
                id: p.id,
                nodeId: p.nodeId,
                type: p.type,
                contextNodeId: p.contextNodeId,
                progress: Math.min(1, (now - p.startTime) / p.duration),
                remainingTime: Math.max(0, p.duration - (now - p.startTime))
            }))
        };
    }
}

export default WorkflowInstance;
