// Function Block Node Handler
// Executes user-defined code (JavaScript or Python)

export default {
    /**
     * Process a function block node
     * @param {object} context - { engine, workflowId, workflowState, executeSignalChain, executeFunctionBlockCode, wasRecentlyExecuted, markAsExecuted }
     * @param {object} node - the function block node
     * @param {string|null} contextNodeId - parent custom node id
     */
    async process(context, node, contextNodeId = null) {
        const {
            workflowId,
            workflowState,
            executeSignalChain,
            executeFunctionBlockCode,
            wasRecentlyExecuted,
            markAsExecuted
        } = context;

        // Skip if recently executed (prevents double-execution when signals converge)
        if (wasRecentlyExecuted(workflowId, node.id, contextNodeId)) {
            // Still propagate downstream
            await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
            return;
        }

        // Mark as executed
        markAsExecuted(workflowId, node.id, contextNodeId);

        const isSync = node.synchronize !== false;

        if (isSync) {
            // Synchronous: wait for completion
            try {
                await executeFunctionBlockCode(node, workflowId);
            } catch (err) {}
        } else {
            // Async: fire and forget
            executeFunctionBlockCode(node, workflowId).catch(() => {});
        }

        // Continue signal chain
        await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
    }
};
