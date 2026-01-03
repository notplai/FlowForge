// Output Node Handler
// Exits a custom node and propagates to parent context

export default {
    /**
     * Process an output node (exits custom node context)
     * @param {object} context - { engine, workflowId, workflowState, processNodeSync, delay, findParentContext }
     * @param {object} node - the output node
     * @param {string|null} contextNodeId - the custom node this output belongs to
     */
    async process(context, node, contextNodeId = null) {
        const { workflowId, workflowState, processNodeSync, delay, findParentContext } = context;

        if (!contextNodeId) {
            return; // Output node outside custom node does nothing
        }

        // Find parent context
        const parentContext = findParentContext(workflowState.nodes, contextNodeId);

        if (parentContext) {
            // Inside a nested custom node - propagate to parent's connections
            const parentConnections = parentContext.internalConnections || [];
            const outgoing = parentConnections.filter(c =>
                String(c.from) === String(contextNodeId) &&
                String(c.sourceHandle) === String(node.id)
            );

            for (const conn of outgoing) {
                const targetNode = parentContext.internalNodes?.find(
                    n => String(n.id) === String(conn.to)
                );

                if (targetNode && !targetNode.disabled) {
                    // Create visual signal
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

                    await delay(1000);

                    // Remove signal
                    const idx = workflowState.activeSignals.findIndex(s => s.id === signal.id);
                    if (idx !== -1) workflowState.activeSignals.splice(idx, 1);

                    await processNodeSync(workflowId, workflowState, targetNode, parentContext.id, conn);
                }
            }
        } else {
            // Top-level custom node (propagate to global connections)
            const outgoing = workflowState.connections.filter(c =>
                String(c.from) === String(contextNodeId) &&
                String(c.sourceHandle) === String(node.id)
            );

            for (const conn of outgoing) {
                const targetNode = workflowState.nodes.find(
                    n => String(n.id) === String(conn.to)
                );

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

                    await delay(1000);

                    const idx = workflowState.activeSignals.findIndex(s => s.id === signal.id);
                    if (idx !== -1) workflowState.activeSignals.splice(idx, 1);

                    await processNodeSync(workflowId, workflowState, targetNode, null, conn);
                }
            }
        }
    }
};
