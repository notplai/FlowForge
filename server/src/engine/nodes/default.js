// Default Node Handler
// Fallback for unknown or standard node types

export default {
    /**
     * Process a standard/unknown node type
     * @param {object} context - { workflowId, workflowState, executeSignalChain, delay }
     * @param {object} node - the node
     * @param {string|null} contextNodeId - parent custom node id
     */
    async process(context, node, contextNodeId = null) {
        const { workflowId, workflowState, executeSignalChain, delay } = context;

        // Small delay for visual effect
        await delay(100);

        // Propagate signal
        await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
    }
};
