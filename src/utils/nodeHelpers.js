// Helper for string-safe ID comparison
export const idEq = (a, b) => String(a) === String(b);

// Node documentation
export const NODE_DOCS = {
    exampleTest: "A example node box.",
    onStart: "It'll start auto when instance online, it's execute once time only.",
    functionBlock: "Execute custom code in Python or JavaScript.",
    wait: "Pauses the execution for a specified amount of time.",
    not: "Inverts the boolean value of the input.",
    or: "Proceeds if any of the incoming connections complete.",
    input: "Taked multi-input from wire.",
    output: "Output to the wire.",
    get: "Get data came with the wire.",
    synchronizeOption: "Disabling this makes the node asynchronous, allowing the next node to run immediately."
};

// Hydrate custom nodes recursively
export function hydrateCustomNodes(nodes, templates) {
    if (!Array.isArray(nodes) || !Array.isArray(templates)) {
        return nodes;
    }

    return nodes.map(node => {
        if (!node.type || typeof node.type !== 'string') return node;

        const template = templates.find(t => t.id === node.type);
        if (!template) return node;

        // Deep clone internal nodes
        const internalNodes = JSON.parse(JSON.stringify(template.internalNodes || []));
        const internalConnections = JSON.parse(JSON.stringify(template.internalConnections || []));

        // Recursively hydrate nested custom nodes
        const hydratedInternal = hydrateCustomNodes(internalNodes, templates);

        // Extract IO from internal nodes
        const inputInternalNodes = hydratedInternal.filter(n => n.type === 'input' && !n.disabled);
        const outputInternalNodes = hydratedInternal.filter(n => n.type === 'output' && !n.disabled);

        const inputs = inputInternalNodes.map(n => ({
            id: n.id,
            label: n.customName || n.label || 'Input'
        }));

        const outputs = outputInternalNodes.map(n => ({
            id: n.id,
            label: n.customName || n.label || 'Output'
        }));

        return {
            ...node,
            label: node.customName || template.name,
            description: template.description,
            category: template.category,
            internalNodes: hydratedInternal,
            internalConnections,
            inputs,
            outputs,
            hasInput: inputs.length > 0,
            hasOutput: outputs.length > 0,
            inputLabel: inputs[0]?.label || 'Input',
            outputLabel: outputs[0]?.label || 'Output'
        };
    });
}

// Dehydrate custom nodes for saving (remove template data)
export function dehydrateCustomNodes(nodes, templates) {
    if (!Array.isArray(nodes)) return nodes;

    return nodes.map(node => {
        const template = templates.find(t => t.id === node.type);
        if (!template) return node;

        // Keep only essential data
        const { internalNodes, internalConnections, inputs, outputs,
            hasInput, hasOutput, inputLabel, outputLabel,
            description, category, ...essentialData } = node;

        return essentialData;
    });
}

// Calculate latency for a custom node
export function calculateNodeLatency(node) {
    return new Promise((resolve) => {
        const internalNodes = node.internalNodes || [];
        const connections = node.internalConnections || [];

        const inputNodes = internalNodes.filter(n => n.type === 'input');
        if (inputNodes.length === 0) {
            resolve(0);
            return;
        }

        let totalDelay = 0;

        // Base latency per node (~1ms)
        totalDelay += internalNodes.length * 1;

        // Connection latency (~0.5ms)
        totalDelay += connections.length * 0.5;

        // Function blocks add more delay
        const functionBlocks = internalNodes.filter(n => n.type === 'functionBlock');
        totalDelay += functionBlocks.length * 2;

        // Wait nodes add their configured delay
        const sleepNodes = internalNodes.filter(n => n.type === 'wait');
        sleepNodes.forEach(n => {
            totalDelay += (n.sleepTime || 1000);
        });

        // Nested custom nodes add estimated delay
        const customNodes = internalNodes.filter(n => n.type === 'custom');
        totalDelay += customNodes.length * 10;

        resolve(totalDelay);
    });
}

// Generate random workflow/node name
export function generateRandomName() {
    const adjectives = ['Swift', 'Silent', 'Bold', 'Brave', 'Calm', 'Cool', 'Dark', 'Deep',
        'Fast', 'Good', 'Hard', 'Hot', 'Kind', 'Loud', 'Mild', 'Nice',
        'Pure', 'Rich', 'Safe', 'Soft', 'Warm', 'Wild', 'Wise'];
    const nouns = ['River', 'Ocean', 'Mountain', 'Forest', 'Sky', 'Star', 'Moon', 'Sun',
        'Wind', 'Rain', 'Fire', 'Ice', 'Snow', 'Storm', 'Cloud', 'Bird',
        'Wolf', 'Bear', 'Lion', 'Tiger', 'Hawk', 'Eagle'];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 100);

    return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// Check if node can be edited
export function canEditNode(node) {
    return !['onStart', 'input', 'output', 'not', 'or'].includes(node?.type);
}

// Get node dimensions
export function getNodeDimensions(node) {
    const isIO = ['input', 'output'].includes(node.type);
    const isCompact = ['onStart', 'not', 'or'].includes(node.type);

    if (isIO) {
        return { width: 120, height: 100 };
    } else if (isCompact) {
        return { width: 150, height: 50 };
    }

    return { width: 200, height: 100 };
}
