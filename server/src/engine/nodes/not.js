// NOT Node Handler
// Inverts/passes signal (logic handled by timing)

export default {
    /**
     * Process a NOT node
     * @param {object} context - { workflowId, workflowState, executeSignalChain }
     * @param {object} node - the NOT node
     * @param {string|null} contextNodeId - parent custom node id
     */
    async process(context, node, contextNodeId = null) {
        const { workflowId, workflowState, executeSignalChain } = context;

        // NOT node (inversion logic is in frontend visualization)
        await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
    }
};
