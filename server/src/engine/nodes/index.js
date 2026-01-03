// Node Handler Registry
// Central registry for all node type handlers

import waitHandler from './wait.js';
import functionBlockHandler from './functionBlock.js';
import customHandler from './custom.js';
import outputHandler from './output.js';
import notHandler from './not.js';
import orHandler from './or.js';
import defaultHandler from './default.js';

// Map of node type -> handler
const nodeHandlers = new Map([
    ['wait', waitHandler],
    ['delay', waitHandler], // alias
    ['functionBlock', functionBlockHandler],
    ['custom', customHandler],
    ['output', outputHandler],
    ['not', notHandler],
    ['or', orHandler],
]);

/**
 * Get handler for a node type
 * @param {string} nodeType 
 * @returns {object} handler with process() method
 */
export function getNodeHandler(nodeType) {
    return nodeHandlers.get(nodeType) || defaultHandler;
}

/**
 * Process a node using its registered handler
 * @param {object} context - execution context with engine, workflowId, workflowState, etc.
 * @param {object} node - the node to process
 * @param {string|null} contextNodeId - parent custom node id if inside one
 * @param {object|null} incomingConnection - the connection that triggered this node
 */
export async function processNode(context, node, contextNodeId = null, incomingConnection = null) {
    const handler = getNodeHandler(node.type);
    return handler.process(context, node, contextNodeId, incomingConnection);
}

export default {
    getNodeHandler,
    processNode,
};
