// Custom Node Handler
// Enters a custom node and executes its internal graph

export default {
    /**
     * Process a custom node (container for internal nodes)
     * @param {object} context - { engine, workflowId, workflowState, executeSignalChain, findEntryNodes }
     * @param {object} node - the custom node
     * @param {string|null} contextNodeId - parent custom node id
     * @param {object|null} incomingConnection - the connection that triggered this
     */
    async process(context, node, contextNodeId = null, incomingConnection = null) {
        const { workflowId, workflowState, executeSignalChain, findEntryNodes } = context;

        if (!node.internalNodes || !node.internalConnections) {
            return;
        }

        // Find the input node matching the incoming connection's targetHandle
        let internalInputNode = null;

        if (incomingConnection?.targetHandle) {
            internalInputNode = node.internalNodes.find(
                n => String(n.id) === String(incomingConnection.targetHandle)
            );
        }

        // Fallback: first input node
        if (!internalInputNode) {
            internalInputNode = node.internalNodes.find(n => n.type === 'input');
        }

        if (internalInputNode) {
            // Execute from the internal input node
            await executeSignalChain(workflowId, workflowState, internalInputNode.id, node.id);
        } else {
            // No input node - try triggering internal onStart nodes
            const internalEntryNodes = findEntryNodes(
                node.internalNodes,
                node.internalConnections || [],
                node.id
            );

            for (const entryNode of internalEntryNodes) {
                if (entryNode.type === 'onStart') {
                    const nodeKey = `${node.id}-${entryNode.id}`;
                    if (!workflowState.triggeredOnStart.has(nodeKey) && !workflowState._onStartFired) {
                        workflowState.triggeredOnStart.add(nodeKey);
                        workflowState._onStartFired = true;
                        await executeSignalChain(workflowId, workflowState, entryNode.id, node.id, true);
                    }
                }
            }
        }
        // Custom nodes don't auto-propagate - output nodes handle that
    }
};
