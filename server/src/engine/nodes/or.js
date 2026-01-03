// OR Node Handler
// OR gate - propagates when any input arrives

export default {
    /**
     * Process an OR node
     * @param {object} context - { workflowId, workflowState, executeSignalChain }
     * @param {object} node - the OR node
     * @param {string|null} contextNodeId - parent custom node id
     */
    async process(context, node, contextNodeId = null) {
        const { workflowId, workflowState, executeSignalChain } = context;

        // OR gate (propagate when any input arrives)
        await executeSignalChain(workflowId, workflowState, node.id, contextNodeId);
    }
};
