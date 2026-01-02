import { useState, useEffect, useCallback } from 'react';
import { nodesAPI } from '../utils/api';

// Process nodes to extract IO information from internal nodes
function processCustomNode(node) {
    const internalNodes = node.internalNodes || [];
    const inputNodes = internalNodes.filter(n => n.type === 'input' && !n.disabled);
    const outputNodes = internalNodes.filter(n => n.type === 'output' && !n.disabled);

    return {
        ...node,
        inputs: inputNodes.map(n => ({
            id: n.id,
            label: n.customName || n.label || 'Input'
        })),
        outputs: outputNodes.map(n => ({
            id: n.id,
            label: n.customName || n.label || 'Output'
        })),
        hasInput: inputNodes.length > 0,
        hasOutput: outputNodes.length > 0
    };
}

export function useCustomNodes() {
    const [customNodes, setCustomNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNodes = useCallback(async (useCache = true) => {
        try {
            setLoading(true);
            setError(null);
            const data = await nodesAPI.getAll(useCache);
            const processed = data.map(processCustomNode);
            setCustomNodes(processed);
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch custom nodes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createNode = useCallback(async (node) => {
        try {
            const newNode = await nodesAPI.create(node);
            await fetchNodes(false); // Refresh without cache
            return newNode;
        } catch (err) {
            console.error('Failed to create node:', err);
            throw err;
        }
    }, [fetchNodes]);

    const updateNode = useCallback(async (id, updates) => {
        try {
            await nodesAPI.update(id, updates);
            await fetchNodes(false); // Refresh without cache
        } catch (err) {
            console.error('Failed to update node:', err);
            throw err;
        }
    }, [fetchNodes]);

    const deleteNode = useCallback(async (id) => {
        try {
            await nodesAPI.delete(id);
            await fetchNodes(false); // Refresh without cache
        } catch (err) {
            console.error('Failed to delete node:', err);
            throw err;
        }
    }, [fetchNodes]);

    const addToTemplates = useCallback((template) => {
        setCustomNodes(prev => [...prev, processCustomNode(template)]);
    }, []);

    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);

    return {
        customNodes,
        loading,
        error,
        refresh: fetchNodes,
        createNode,
        updateNode,
        deleteNode,
        addToTemplates
    };
}
