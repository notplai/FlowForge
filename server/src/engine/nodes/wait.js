// Wait/Delay Node Handler
// Pauses execution for a specified duration

export default {
    /**
     * Process a wait/delay node
     * @param {object} context - { engine, workflowId, workflowState, executeSignalChain, delay }
     * @param {object} node - the wait node
     * @param {string|null} contextNodeId - parent custom node id
     */
    async process(context, node, contextNodeId = null) {
        const { workflowId, workflowState, executeSignalChain, delay } = context;

        const delayTime = node.sleepTime || node.data?.delay || 1000;

        // Track processing state for UI visualization
        const processing = {
            id: Date.now() + Math.random(),
            nodeId: node.id,
            type: node.type,
            startTime: Date.now(),
            duration: delayTime,
            contextNodeId
        };
        workflowState.processingNodes.push(processing);

        // Wait for the delay
        await delay(delayTime);

        // Remove from processing
        const idx = workflowState.processingNodes.findIndex(p => p.id === processing.id);
        if (idx !== -1) workflowState.processingNodes.splice(idx, 1);

        // Continue the signal chain
        await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
    }
};
