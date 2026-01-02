import React, { useState, useRef, useEffect, useCallback } from 'react';

import pointerIcon from '../assets/icons/tools/cursors/pointer.svg';
import grabIcon from '../assets/icons/tools/cursors/grab.svg';
import helpIcon from '../assets/icons/tools/cursors/help.svg';
import warningIcon from '../assets/icons/warning.svg';
import saveIcon from '../assets/icons/save.svg';
import CodeEditor from './CodeEditor';

// Helper for string-safe ID comparison (handles number vs string mismatch)
const idEq = (a, b) => String(a) === String(b);

const NODE_DOCS = {
    exampleTest: "A example node box.",

    onStart: "It'll start auto when instance online, it's execute once time only.",
    onClick: "Triggered when the user clicks on this node.",

    functionBlock: "Execute custom code in Python or JavaScript.",

    sleep: "Pauses the execution for a specified amount of time.",
    not: "Inverts the boolean value of the input.",
    or: "Proceeds if any of the incoming connections complete.",

    input: "Taked multi-input from wire.",
    output: "Output to the wire.",
    get: "Get data came with the wire.",

    synchronizeOption: "Disabling this makes the node asynchronous, allowing the next node to run immediately."
};

function Editor({ workflow, customNode, onBack, onSave, keybinds, editorSettings, theme = 'dark' }) {
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [comments, setComments] = useState([]);
    const [customNodeTemplates, setCustomNodeTemplates] = useState([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Undo/Redo State
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoRedoAction = useRef(false);

    // Save Notification State
    const [saveNotification, setSaveNotification] = useState(null);

    // Tool State
    const [activeTool, setActiveTool] = useState('pointer');
    const [showToolMenu, setShowToolMenu] = useState(false);
    const [toolMenuPos, setToolMenuPos] = useState({ x: 0, y: 0 });
    const rawMousePos = useRef({ x: 0, y: 0 });

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState(null);
    const [draggedCommentId, setDraggedCommentId] = useState(null);
    const [resizingCommentId, setResizingCommentId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });

    const [connectingNodeId, setConnectingNodeId] = useState(null);
    const [connectingHandleId, setConnectingHandleId] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [selectedConnectionIds, setSelectedConnectionIds] = useState([]);
    const [hoverCommentId, setHoverCommentId] = useState(null);
    const [hoverDoc, setHoverDoc] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
    const [sidebarDragType, setSidebarDragType] = useState(null);
    const [dragMousePos, setDragMousePos] = useState({ x: 0, y: 0 });

    // Selection State
    const [selectedNodeIds, setSelectedNodeIds] = useState([]);
    const [dragOffsets, setDragOffsets] = useState({});
    const [isCopying, setIsCopying] = useState(false);
    const [dragStartPos, setDragStartPos] = useState(null);
    const [wasSelectedAtMouseDown, setWasSelectedAtMouseDown] = useState(false);

    // Selection Box State
    const [selectionBox, setSelectionBox] = useState(null);
    const [clipboard, setClipboard] = useState(null);

    // View State (Pan & Zoom)
    const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const canvasRef = useRef(null);
    const nodeRefs = useRef({});

    // Signal Animation State
    const [activeSignals, setActiveSignals] = useState([]);
    const notNodeInputTimes = useRef({});
    const activatedNodes = useRef(new Set());
    const simulationTime = useRef(Date.now());
    const signalAnimationRef = useRef(null);
    const processedSignals = useRef(new Set());
    const executedFunctionBlocks = useRef(new Set());
    const lastLoadedId = useRef(null);

    // Load Custom Nodes from Server
    useEffect(() => {
        const fetchCustomNodes = async () => {
            try {
                const response = await fetch('/api/nodes');
                if (response.ok) {
                    const nodes = await response.json();
                    const processedNodes = nodes.map(n => ({
                        ...n,
                        id: n.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));
                    setCustomNodeTemplates(processedNodes);
                }
            } catch (error) {
                console.error('Failed to fetch custom nodes:', error);
            }
        };
        fetchCustomNodes();
    }, []);

    // Hydrate custom nodes recursively
    const hydrateCustomNodes = useCallback((nodesList, templates) => {
        const hydrateRecursive = (nodes) => {
            return nodes.map(n => {
                if (n.type === 'custom' && n.templateId) {
                    const template = templates.find(t => t.id === n.templateId);
                    if (template) {
                        const newNodeId = n.id;
                        const idMap = new Map();

                        // First pass: create ID mapping for all internal nodes
                        template.internalNodes.forEach(inNode => {
                            const newId = `${newNodeId}.${inNode.id}`;
                            idMap.set(String(inNode.id), newId);
                        });

                        const newInternalNodes = template.internalNodes.map(inNode => {
                            const newId = idMap.get(String(inNode.id)) || `${newNodeId}.${inNode.id}`;
                            return { ...inNode, id: newId };
                        });

                        // Helper to remap an ID - handles nested prefixes
                        const remapId = (id) => {
                            if (!id) return null;
                            const idStr = String(id);
                            for (const [oldId, newId] of idMap.entries()) {
                                if (idStr === oldId) return newId;
                                if (idStr.startsWith(oldId + '.')) {
                                    return newId + idStr.slice(oldId.length);
                                }
                            }
                            return id;
                        };

                        const newInternalConnections = template.internalConnections.map(c => ({
                            ...c,
                            id: `${newNodeId}.${c.id}`,
                            from: remapId(c.from),
                            to: remapId(c.to),
                            targetHandle: remapId(c.targetHandle),
                            sourceHandle: remapId(c.sourceHandle)
                        }));

                        // Extract inputs from internal 'input' nodes (excluding disabled)
                        const inputInternalNodes = template.internalNodes.filter(n => n.type === 'input' && !n.disabled).sort((a, b) => a.y - b.y);
                        const newInputs = inputInternalNodes.map(n => ({
                            id: idMap.get(String(n.id)) || n.id,
                            label: n.customName || n.label || 'Input'
                        }));

                        // Extract outputs from internal 'output' nodes (excluding disabled)
                        const outputInternalNodes = template.internalNodes.filter(n => n.type === 'output' && !n.disabled).sort((a, b) => a.y - b.y);
                        const newOutputs = outputInternalNodes.map(n => ({
                            id: idMap.get(String(n.id)) || n.id,
                            label: n.customName || n.label || 'Output'
                        }));

                        // Recursively hydrate nested custom nodes
                        const hydratedInternalNodes = hydrateRecursive(newInternalNodes);

                        return {
                            ...n,
                            description: template.description,
                            category: template.category,
                            inputs: newInputs,
                            outputs: newOutputs,
                            hasInput: template.hasInput,
                            hasOutput: template.hasOutput,
                            inputLabel: template.inputLabel,
                            outputLabel: template.outputLabel,
                            internalNodes: hydratedInternalNodes,
                            internalConnections: newInternalConnections
                        };
                    }
                }
                return n;
            });
        };
        return hydrateRecursive(nodesList);
    }, []);

    // Reset hasLoaded when switching workflow or custom node
    useEffect(() => {
        setHasLoaded(false);
        // Clear activated nodes when switching workflow
        activatedNodes.current = new Set();
        notNodeInputTimes.current = {};
    }, [workflow?.id, customNode?.id]);

    // Load workflow data or custom node
    useEffect(() => {
        const currentId = customNode ? customNode.id : workflow?.id;

        // Prevent reloading on prop updates (e.g. runtime status) if ID hasn't changed
        if (hasLoaded && lastLoadedId.current === currentId) return;

        if (customNode) {
            // Load custom node for editing
            let loadedNodes = customNode.internalNodes || [];

            // Hydrate custom nodes if templates are available
            if (customNodeTemplates.length > 0) {
                loadedNodes = hydrateCustomNodes(loadedNodes, customNodeTemplates);
            }

            setNodes(loadedNodes);
            setConnections(customNode.internalConnections || []);
            setComments([]);
            setHasLoaded(true);
            lastLoadedId.current = currentId;
        } else if (workflow) {
            let loadedNodes = workflow.nodes || [];

            // Hydrate custom nodes if templates are available
            if (customNodeTemplates.length > 0) {
                loadedNodes = hydrateCustomNodes(loadedNodes, customNodeTemplates);
            }

            setNodes(loadedNodes);
            if (workflow.connections) setConnections(workflow.connections);
            if (workflow.comments) setComments(workflow.comments);
            setHasLoaded(true);
            lastLoadedId.current = currentId;
        }
    }, [workflow, customNode, customNodeTemplates, hasLoaded, hydrateCustomNodes]);

    // Hydrate runtime state from backend (One-time sync on load)
    useEffect(() => {
        if (hasLoaded && workflow?.runtime && workflow.status === 'Online') {
            const now = Date.now();

            // Hydrate Signals (Visuals)
            if (workflow.runtime.signals) {
                const hydratedSignals = workflow.runtime.signals.map(s => ({
                    id: s.id,
                    connectionId: s.connectionId,
                    progress: s.progress,
                    contextNodeId: s.contextNodeId,
                    startTime: now - (s.progress * 1000) // Reverse-engineer start time for smooth animation
                }));

                setActiveSignals(prev => {
                    // Avoid duplicates
                    const existingIds = new Set(prev.map(s => s.id));
                    const newSignals = hydratedSignals.filter(s => !existingIds.has(s.id));
                    return [...prev, ...newSignals];
                });
            }

            // Hydrate Processing Nodes
            // If a node is sleeping on backend, we set a local timeout to trigger its output when done.
            if (workflow.runtime.processingNodes) {
                workflow.runtime.processingNodes.forEach(p => {
                    if (p.type === 'sleep' && p.remainingTime > 0) {
                        // Set a timeout to trigger the signal locally when the backend sleep finishes
                        setTimeout(() => {
                            // We use a function ref or similar if we needed latest state, 
                            // but here we assume nodes/connections don't change drastically during this wait.
                            // We need to find the node to ensure it still exists/enabled
                            const currentNode = nodes.find(n => idEq(n.id, p.nodeId));
                            if (currentNode && !currentNode.disabled) {
                                triggerSignal(p.nodeId, p.contextNodeId);
                            }
                        }, p.remainingTime);
                    }
                });
            }

            // Sync OnStart Triggers
            // Prevent OnStart nodes from firing again if they already fired on backend
            if (workflow.runtime.triggeredOnStart) {
                workflow.runtime.triggeredOnStart.forEach(id => triggeredOnStartNodes.current.add(id));
            }
        }
    }, [hasLoaded, workflow]); // Run when hasLoaded becomes true and workflow is available

    // When editing a custom node, update inputs/outputs when internal input/output nodes change
    useEffect(() => {
        if (customNode && nodes.length > 0) {
            const inputInternalNodes = nodes.filter(n => n.type === 'input' && !n.disabled).sort((a, b) => a.y - b.y);
            const outputInternalNodes = nodes.filter(n => n.type === 'output' && !n.disabled).sort((a, b) => a.y - b.y);

            const newInputs = inputInternalNodes.map(n => ({
                id: n.id,
                label: n.customName || n.label || 'Input'
            }));

            const newOutputs = outputInternalNodes.map(n => ({
                id: n.id,
                label: n.customName || n.label || 'Output'
            }));

            // Update the customNode reference silently (no save yet)
            if (JSON.stringify(customNode.inputs) !== JSON.stringify(newInputs) ||
                JSON.stringify(customNode.outputs) !== JSON.stringify(newOutputs)) {
                customNode.inputs = newInputs;
                customNode.outputs = newOutputs;
            }
        }
    }, [nodes, customNode]);

    // Save state to history for undo/redo
    const saveToHistory = useCallback(() => {
        if (isUndoRedoAction.current) {
            isUndoRedoAction.current = false;
            return;
        }

        const state = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections)),
            comments: JSON.parse(JSON.stringify(comments))
        };

        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(state);
            // Limit history to 50 states
            if (newHistory.length > 50) {
                newHistory.shift();
                return newHistory;
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [nodes, connections, comments, historyIndex]);

    // Track changes for undo/redo
    useEffect(() => {
        if (nodes.length > 0 || connections.length > 0 || comments.length > 0) {
            const timer = setTimeout(() => {
                saveToHistory();
            }, 500); // Debounce to avoid saving too frequently
            return () => clearTimeout(timer);
        }
    }, [nodes, connections, comments]);

    // Undo function
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedoAction.current = true;
            const prevState = history[historyIndex - 1];
            setNodes(JSON.parse(JSON.stringify(prevState.nodes)));
            setConnections(JSON.parse(JSON.stringify(prevState.connections)));
            setComments(JSON.parse(JSON.stringify(prevState.comments)));
            setHistoryIndex(prev => prev - 1);
        }
    }, [history, historyIndex]);

    // Redo function
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoRedoAction.current = true;
            const nextState = history[historyIndex + 1];
            setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
            setConnections(JSON.parse(JSON.stringify(nextState.connections)));
            setComments(JSON.parse(JSON.stringify(nextState.comments)));
            setHistoryIndex(prev => prev + 1);
        }
    }, [history, historyIndex]);

    // Helper: Convert Screen to World Coordinates
    const screenToWorld = (screenX, screenY) => {
        const bounds = canvasRef.current.getBoundingClientRect();
        return {
            x: (screenX - bounds.left - view.x) / view.zoom,
            y: (screenY - bounds.top - view.y) / view.zoom
        };
    };

    const worldToScreen = (worldX, worldY) => {
        return {
            x: view.x + worldX * view.zoom,
            y: view.y + worldY * view.zoom
        };
    };

    useEffect(() => {
        let animationFrameId;

        const animateSignals = () => {
            simulationTime.current += 16; // Advance simulation time by ~1 frame (16ms)
            setActiveSignals(prevSignals => {
                const nextSignals = [];
                const now = simulationTime.current;

                // Track which wires should be active this frame
                const activeWireIds = new Set();

                // Clean up old processed signals (older than 100ms)
                const oldIds = Array.from(processedSignals.current).filter(id => {
                    // Extract timestamp from id (signals use Date.now() + Math.random())
                    const timestamp = Math.floor(id);
                    return now - timestamp > 100;
                });
                oldIds.forEach(id => processedSignals.current.delete(id));

                // Process existing signals
                prevSignals.forEach(signal => {
                    const signalAge = now - (signal.startTime || 0);

                    // Keep signal visible for 50ms for visual feedback (rapid signal)
                    if (signalAge < 50) {
                        nextSignals.push(signal);
                        activeWireIds.add(signal.connectionId);

                        // Mark NOT nodes receiving signals as suppressed
                        let connection = connections.find(c => connectionKey(c) === signal.connectionId);
                        let contextNode = null;

                        if (!connection && signal.contextNodeId) {
                            const findContext = (nodesList) => {
                                for (const n of nodesList) {
                                    if (idEq(n.id, signal.contextNodeId)) return n;
                                    if (n.type === 'custom' && n.internalNodes) {
                                        const found = findContext(n.internalNodes);
                                        if (found) return found;
                                    }
                                }
                                return null;
                            };
                            contextNode = findContext(nodes);
                            if (contextNode && contextNode.internalConnections) {
                                connection = contextNode.internalConnections.find(c => connectionKey(c) === signal.connectionId);
                            }
                        }

                        if (connection) {
                            let targetNode = null;
                            if (contextNode) {
                                targetNode = contextNode.internalNodes?.find(n => idEq(n.id, connection.to));
                            } else {
                                targetNode = nodes.find(n => idEq(n.id, connection.to));
                            }

                            if (targetNode?.type === 'not') {
                                const key = contextNode ? `${contextNode.id}-${targetNode.id}` : String(targetNode.id);
                                notNodeInputTimes.current[key] = now;
                            }
                        }
                    }

                    // Process signal arrival
                    if (!processedSignals.current.has(signal.id) && signal.progress >= 1) {
                        processedSignals.current.add(signal.id);

                        // Find connection
                        let connection = connections.find(c => connectionKey(c) === signal.connectionId);
                        let contextNode = null;

                        if (!connection && signal.contextNodeId) {
                            const findContext = (nodesList) => {
                                for (const n of nodesList) {
                                    if (idEq(n.id, signal.contextNodeId)) return n;
                                    if (n.type === 'custom' && n.internalNodes) {
                                        const found = findContext(n.internalNodes);
                                        if (found) return found;
                                    }
                                }
                                return null;
                            };
                            contextNode = findContext(nodes);
                            if (contextNode && contextNode.internalConnections) {
                                connection = contextNode.internalConnections.find(c => connectionKey(c) === signal.connectionId);
                            }
                        }

                        if (connection) {
                            let targetNode = null;
                            if (contextNode) {
                                targetNode = contextNode.internalNodes?.find(n => idEq(n.id, connection.to));
                            } else {
                                targetNode = nodes.find(n => idEq(n.id, connection.to));
                            }

                            if (targetNode && !targetNode.disabled) {
                                // Handle different node types
                                if (targetNode.type === 'not') {
                                    // NOT nodes handled separately - just suppress
                                } else if (targetNode.type === 'functionBlock') {
                                    // Create unique key for this function block execution
                                    const fbKey = contextNode
                                        ? `${contextNode.id}-${targetNode.id}`
                                        : String(targetNode.id);

                                    // Skip if already executed in this wave
                                    if (!executedFunctionBlocks.current.has(fbKey)) {
                                        executedFunctionBlocks.current.add(fbKey);

                                        setTimeout(() => {
                                            executedFunctionBlocks.current.delete(fbKey);
                                        }, 200);

                                        const isSync = targetNode.synchronize !== false;
                                        const requestBody = {
                                            nodeId: targetNode.id,
                                            contextNodeId: contextNode ? contextNode.id : null,
                                            // Send workflow data for unsaved workflows or offline workflows
                                            workflowData: workflow.status !== 'Online' ? {
                                                id: workflow.id,
                                                name: workflow.name,
                                                nodes: nodes,
                                                connections: connections
                                            } : undefined
                                        };

                                        if (isSync) {
                                            fetch(`http://localhost:3001/api/workflows/${workflow.id}/execute-node`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(requestBody)
                                            })
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        triggerSignal(targetNode.id, contextNode?.id);
                                                    }
                                                })
                                                .catch(err => console.error('Function block error:', err));
                                        } else {
                                            fetch(`http://localhost:3001/api/workflows/${workflow.id}/execute-node`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(requestBody)
                                            }).catch(err => console.error('Async function block error:', err));
                                            // Defer to avoid calling setState during setState
                                            setTimeout(() => triggerSignal(targetNode.id, contextNode?.id), 0);
                                        }
                                    }
                                } else if (targetNode.type === 'sleep') {
                                    setTimeout(() => {
                                        triggerSignal(targetNode.id, contextNode?.id);
                                    }, targetNode.sleepTime || 1000);
                                } else if (targetNode.type === 'custom') {
                                    if (targetNode.internalNodes && targetNode.internalConnections) {
                                        const targetHandle = connection.targetHandle;
                                        let internalInputNode = targetHandle
                                            ? targetNode.internalNodes.find(n => idEq(n.id, targetHandle))
                                            : targetNode.internalNodes.find(n => n.type === 'input');

                                        if (internalInputNode) {
                                            const outgoing = targetNode.internalConnections.filter(c => idEq(c.from, internalInputNode.id));
                                            outgoing.forEach(conn => {
                                                nextSignals.push({
                                                    id: Date.now() + Math.random(),
                                                    connectionId: connectionKey(conn),
                                                    progress: 1,
                                                    startTime: now,
                                                    contextNodeId: targetNode.id
                                                });
                                            });
                                        }
                                    }
                                } else if (targetNode.type === 'output' && contextNode) {
                                    const findParentContext = (nodesList, childId, parent = null) => {
                                        for (const n of nodesList) {
                                            if (idEq(n.id, childId)) return parent;
                                            if (n.type === 'custom' && n.internalNodes) {
                                                const found = findParentContext(n.internalNodes, childId, n);
                                                if (found !== undefined) return found;
                                            }
                                        }
                                        return undefined;
                                    };
                                    const parentContext = findParentContext(nodes, contextNode.id);

                                    const exitConns = parentContext
                                        ? parentContext.internalConnections.filter(c => idEq(c.from, contextNode.id) && idEq(c.sourceHandle, targetNode.id))
                                        : connections.filter(c => idEq(c.from, contextNode.id) && idEq(c.sourceHandle, targetNode.id));

                                    exitConns.forEach(conn => {
                                        nextSignals.push({
                                            id: Date.now() + Math.random(),
                                            connectionId: connectionKey(conn),
                                            progress: 1,
                                            startTime: now,
                                            contextNodeId: parentContext?.id || null
                                        });
                                    });
                                } else {
                                    // Standard pass-through nodes - propagate immediately
                                    const outgoing = contextNode
                                        ? contextNode.internalConnections.filter(c => idEq(c.from, targetNode.id))
                                        : connections.filter(c => idEq(c.from, targetNode.id));

                                    outgoing.forEach(conn => {
                                        nextSignals.push({
                                            id: Date.now() + Math.random(),
                                            connectionId: connectionKey(conn),
                                            progress: 1,
                                            startTime: now,
                                            contextNodeId: contextNode?.id || null
                                        });
                                    });
                                }
                            }
                        }
                    }
                });

                // Global set to track firing nodes across all levels
                const globalFiringNodes = new Set();

                const processNodeGraph = (nodeList, connList, contextNode, externalActiveInputs = new Set()) => {
                    // Build connection maps for quick lookup
                    const incomingMap = new Map(); // nodeId -> array of source nodeIds
                    const outgoingMap = new Map(); // nodeId -> array of target nodeIds
                    const connectionMap = new Map(); // nodeId -> array of connections FROM this node

                    nodeList.forEach(n => {
                        incomingMap.set(String(n.id), []);
                        outgoingMap.set(String(n.id), []);
                        connectionMap.set(String(n.id), []);
                    });

                    connList.forEach(c => {
                        const fromId = String(c.from);
                        const toId = String(c.to);

                        if (incomingMap.has(toId)) {
                            incomingMap.get(toId).push(fromId);
                        }
                        if (outgoingMap.has(fromId)) {
                            outgoingMap.get(fromId).push(toId);
                        }
                        if (connectionMap.has(fromId)) {
                            connectionMap.get(fromId).push(c);
                        }
                    });

                    // PRELOAD PHASE: Find entry points (nodes with NO incoming wires)
                    const entryPoints = nodeList.filter(n => {
                        if (n.disabled) return false;
                        const incoming = incomingMap.get(String(n.id)) || [];
                        return incoming.length === 0;
                    });

                    // BUILD EXECUTION ORDER: BFS from entry points following wires
                    const executionOrder = [];
                    const visited = new Set();
                    const queue = [...entryPoints];

                    while (queue.length > 0) {
                        const node = queue.shift();
                        const nodeId = String(node.id);

                        if (visited.has(nodeId)) continue;
                        visited.add(nodeId);
                        executionOrder.push(node);

                        // Follow outgoing wires to discover next nodes
                        const targets = outgoingMap.get(nodeId) || [];
                        targets.forEach(targetId => {
                            if (!visited.has(targetId)) {
                                const targetNode = nodeList.find(n => idEq(n.id, targetId));
                                if (targetNode && !targetNode.disabled) {
                                    queue.push(targetNode);
                                }
                            }
                        });
                    }

                    // Track which nodes are currently "firing" (outputting signal) in THIS context
                    const localFiringNodes = new Set();

                    executionOrder.forEach(node => {
                        const nodeId = String(node.id);
                        const nodeKey = contextNode ? `${contextNode.id}-${node.id}` : nodeId;
                        const incoming = incomingMap.get(nodeId) || [];
                        const outgoingConns = connectionMap.get(nodeId) || [];

                        // Check if any upstream node is firing a signal to this node
                        const hasUpstreamSignal = incoming.some(srcId => {
                            const srcKey = contextNode ? `${contextNode.id}-${srcId}` : srcId;
                            return localFiringNodes.has(srcKey) || globalFiringNodes.has(srcKey);
                        });

                        // Also check if this node has active wire input from previous frame
                        const hasActiveWireInput = connList.some(c => {
                            if (!idEq(c.to, node.id)) return false;
                            return activeWireIds.has(connectionKey(c));
                        });

                        // For INPUT nodes inside custom nodes: check if external input is active
                        const isExternalInputActive = node.type === 'input' && externalActiveInputs.has(String(node.id));

                        const hasInput = hasUpstreamSignal || hasActiveWireInput || isExternalInputActive;

                        if (node.type === 'input') {
                            // INPUT NODE inside custom node
                            // Fires if external input handle is receiving signal
                            if (isExternalInputActive) {
                                localFiringNodes.add(nodeKey);
                                globalFiringNodes.add(nodeKey);

                                outgoingConns.forEach(conn => {
                                    const connKey = connectionKey(conn);
                                    nextSignals.push({
                                        id: Date.now() + Math.random(),
                                        connectionId: connKey,
                                        progress: 1,
                                        startTime: now,
                                        contextNodeId: contextNode?.id || null
                                    });
                                    activeWireIds.add(connKey);
                                });
                            }
                        } else if (node.type === 'not') {
                            // NOT NODE: Inverter logic

                            if (!hasInput) {
                                // No input → output is ON
                                localFiringNodes.add(nodeKey);
                                globalFiringNodes.add(nodeKey);

                                outgoingConns.forEach(conn => {
                                    const connKey = connectionKey(conn);
                                    nextSignals.push({
                                        id: Date.now() + Math.random(),
                                        connectionId: connKey,
                                        progress: 1,
                                        startTime: now,
                                        contextNodeId: contextNode?.id || null
                                    });
                                    activeWireIds.add(connKey);
                                });
                            }
                            // If has input → don't fire (output is OFF)
                        } else if (node.type === 'or') {
                            // OR NODE: Output if ANY input is active
                            if (hasInput) {
                                localFiringNodes.add(nodeKey);
                                globalFiringNodes.add(nodeKey);

                                outgoingConns.forEach(conn => {
                                    const connKey = connectionKey(conn);
                                    nextSignals.push({
                                        id: Date.now() + Math.random(),
                                        connectionId: connKey,
                                        progress: 1,
                                        startTime: now,
                                        contextNodeId: contextNode?.id || null
                                    });
                                    activeWireIds.add(connKey);
                                });
                            }
                        } else if (node.type === 'output') {
                            // OUTPUT NODE inside custom node
                            // If it receives signal, the custom node's output fires
                            if (hasInput) {
                                localFiringNodes.add(nodeKey);
                                globalFiringNodes.add(nodeKey);
                                // Don't create internal signals - the parent context handles output
                            }
                        } else if (node.type === 'custom') {
                            // CUSTOM NODE: Dig into internal nodes
                            // First, determine which internal Input nodes should be active
                            const internalActiveInputs = new Set();

                            // Check which input handles of this custom node are receiving signals
                            if (node.internalNodes) {
                                node.internalNodes.forEach(internalNode => {
                                    if (internalNode.type === 'input') {
                                        // Check if there's an incoming connection to this handle
                                        const hasIncomingSignal = connList.some(c => {
                                            if (!idEq(c.to, node.id)) return false;
                                            // Match targetHandle to internal input node id
                                            const handleMatches = idEq(c.targetHandle, internalNode.id) ||
                                                (!c.targetHandle && node.internalNodes.filter(n => n.type === 'input').indexOf(internalNode) === 0);

                                            if (!handleMatches) return false;

                                            // Check if the source is firing
                                            const srcKey = contextNode ? `${contextNode.id}-${c.from}` : String(c.from);
                                            return localFiringNodes.has(srcKey) || globalFiringNodes.has(srcKey) || activeWireIds.has(connectionKey(c));
                                        });

                                        if (hasIncomingSignal) {
                                            internalActiveInputs.add(String(internalNode.id));
                                        }
                                    }
                                });
                            }

                            // Recursively process internal nodes
                            if (node.internalNodes && node.internalConnections) {
                                processNodeGraph(node.internalNodes, node.internalConnections, node, internalActiveInputs);
                            }

                            // Check if any internal Output node is firing
                            if (node.internalNodes) {
                                const anyOutputFiring = node.internalNodes.some(internalNode => {
                                    if (internalNode.type !== 'output') return false;
                                    const internalKey = `${node.id}-${internalNode.id}`;
                                    return globalFiringNodes.has(internalKey);
                                });

                                if (anyOutputFiring) {
                                    localFiringNodes.add(nodeKey);
                                    globalFiringNodes.add(nodeKey);

                                    // Fire signals on outgoing connections
                                    outgoingConns.forEach(conn => {
                                        const connKey = connectionKey(conn);
                                        nextSignals.push({
                                            id: Date.now() + Math.random(),
                                            connectionId: connKey,
                                            progress: 1,
                                            startTime: now,
                                            contextNodeId: contextNode?.id || null
                                        });
                                        activeWireIds.add(connKey);
                                    });
                                }
                            }
                        } else if (node.type === 'sleep' || node.type === 'functionBlock') {
                        } else {
                            // If this node has upstream signal, it fires downstream
                            if (hasInput) {
                                localFiringNodes.add(nodeKey);
                                globalFiringNodes.add(nodeKey);

                                outgoingConns.forEach(conn => {
                                    const connKey = connectionKey(conn);
                                    nextSignals.push({
                                        id: Date.now() + Math.random(),
                                        connectionId: connKey,
                                        progress: 1,
                                        startTime: now,
                                        contextNodeId: contextNode?.id || null
                                    });
                                    activeWireIds.add(connKey);
                                });
                            }
                        }
                    });
                };

                processNodeGraph(nodes, connections, null, new Set());

                return nextSignals;
            });
            animationFrameId = requestAnimationFrame(animateSignals);
        };

        // Always start the animation loop
        animationFrameId = requestAnimationFrame(animateSignals);

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [connections, nodes]);

    const triggerSignal = (nodeId, contextNodeId = null) => {
        let outgoingConnections = [];

        if (contextNodeId) {
            // Recursively find context node (it could be deeply nested)
            const findContextNode = (nodesList) => {
                for (const n of nodesList) {
                    if (idEq(n.id, contextNodeId)) return n;
                    if (n.type === 'custom' && n.internalNodes) {
                        const found = findContextNode(n.internalNodes);
                        if (found) return found;
                    }
                }
                return null;
            };
            const contextNode = findContextNode(nodes);

            if (contextNode && contextNode.internalConnections) {
                outgoingConnections = contextNode.internalConnections.filter(c => idEq(c.from, nodeId));
            }
        } else {
            outgoingConnections = connections.filter(c => idEq(c.from, nodeId));
        }

        // Create instant signals with strong pulse for visual feedback
        const newSignals = outgoingConnections.map(conn => ({
            id: Date.now() + Math.random(),
            connectionId: connectionKey(conn),
            progress: 1, // Instant - already at destination
            startTime: simulationTime.current,
            contextNodeId: contextNodeId,
            isPulse: true // Strong visual pulse from OnClick
        }));

        if (newSignals.length > 0) {
            setActiveSignals(prev => [...prev, ...newSignals]);
        }
    };

    const handleNodeClick = (e, node) => {
        if (node.type === 'onClick' && !node.disabled) {
            triggerSignal(node.id);
        }
    };

    // OnStart Logical
    const triggeredOnStartNodes = useRef(new Set());
    const lastWorkflowStatus = useRef(null);

    useEffect(() => {
        const currentStatus = workflow?.status;
        const previousStatus = lastWorkflowStatus.current;

        // When workflow transitions to Online from Offline (or undefined/null)
        if (currentStatus === 'Online' && previousStatus !== 'Online') {
            // Clear previous triggers on fresh start
            triggeredOnStartNodes.current.clear();

            // Sync with backend triggers if available (Initial Load of running workflow)
            if (workflow?.runtime?.triggeredOnStart) {
                workflow.runtime.triggeredOnStart.forEach(id => triggeredOnStartNodes.current.add(id));
            }

            const triggerRecursive = (nodesList, contextNodeId = null) => {
                nodesList.forEach(node => {
                    const nodeKey = contextNodeId ? `${contextNodeId}-${node.id}` : node.id;
                    if (node.type === 'onStart' && !node.disabled && !triggeredOnStartNodes.current.has(nodeKey)) {
                        triggeredOnStartNodes.current.add(nodeKey);
                        triggerSignal(node.id, contextNodeId);
                    } else if (node.type === 'custom' && !node.disabled && node.internalNodes) {
                        triggerRecursive(node.internalNodes, node.id);
                    }
                });
            };
            triggerRecursive(nodes);
        }

        // When workflow goes Offline, clear the triggers for next start
        if (currentStatus === 'Offline' && previousStatus === 'Online') {
            triggeredOnStartNodes.current.clear();
        }

        // Update last status
        lastWorkflowStatus.current = currentStatus;
    }, [workflow?.status, nodes]);

    const handleSave = useCallback(async () => {
        if (customNode) {
            // Strip redundant data from custom nodes before saving
            const cleanNodes = nodes.map(n => {
                if (n.type === 'custom') {
                    const {
                        internalNodes,
                        internalConnections,
                        inputs,
                        outputs,
                        description,
                        category,
                        hasInput,
                        hasOutput,
                        inputLabel,
                        outputLabel,
                        ...rest
                    } = n;
                    return rest;
                }
                return n;
            });

            // Save custom node
            const updatedNode = {
                ...customNode,
                internalNodes: cleanNodes,
                internalConnections: connections
            };

            try {
                await fetch('http://localhost:3001/api/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedNode)
                });

                // Re-fetch custom node templates to get updated version
                const response = await fetch('/api/nodes');
                if (response.ok) {
                    const updatedTemplates = await response.json();
                    const processedNodes = updatedTemplates.map(n => ({
                        ...n,
                        id: n.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));
                    setCustomNodeTemplates(processedNodes);
                }

                // Show save notification
                setSaveNotification({ name: customNode.name, show: true });
                setTimeout(() => setSaveNotification(null), 3000);
            } catch (err) {
                console.error('Failed to save custom node:', err);
            }
        } else if (onSave) {
            // Strip redundant data from custom nodes before saving workflow
            const cleanNodes = nodes.map(n => {
                if (n.type === 'custom') {
                    // We only keep the essential instance data.
                    const {
                        internalNodes,
                        internalConnections,
                        inputs,
                        outputs,
                        description,
                        category,
                        hasInput,
                        hasOutput,
                        inputLabel,
                        outputLabel,
                        ...rest
                    } = n;
                    return rest;
                }
                return n;
            });

            onSave({
                ...workflow,
                nodes: cleanNodes,
                connections,
                comments
            });

            // Show save notification
            setSaveNotification({ name: workflow.name, show: true });
            setTimeout(() => setSaveNotification(null), 3000);
        }
    }, [nodes, connections, comments, workflow, customNode, onSave]);

    // Re-hydrate nodes when custom node templates are updated
    useEffect(() => {
        if (!customNode && workflow && customNodeTemplates.length > 0 && nodes.length > 0) {
            const hasCustomNodes = nodes.some(n => n.type === 'custom');
            if (hasCustomNodes) {
                const rehydratedNodes = hydrateCustomNodes(nodes, customNodeTemplates);
                setNodes(rehydratedNodes);
            }
        }
    }, [customNodeTemplates]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editModal) return;

            const triggerKey = keybinds?.toolMenu || 'Tab';
            if (e.key === triggerKey) {
                e.preventDefault();
                if (!showToolMenu) {
                    setShowToolMenu(true);
                    // Adjust for menu size (approx) to center it or place it near cursor
                    setToolMenuPos({ x: rawMousePos.current.x, y: rawMousePos.current.y });
                }
            }

            const checkKeybind = (binding) => {
                if (!binding) return false;
                const parts = binding.split('+');
                const key = parts.pop().toLowerCase();
                const modifiers = parts.map(p => p.toLowerCase());

                const eventKey = e.key.toLowerCase();
                if (eventKey !== key) return false;

                const ctrl = modifiers.includes('ctrl') || modifiers.includes('control');
                const alt = modifiers.includes('alt');
                const shift = modifiers.includes('shift');
                const meta = modifiers.includes('meta') || modifiers.includes('cmd');

                return (ctrl === e.ctrlKey && alt === e.altKey && shift === e.shiftKey && meta === e.metaKey);
            };

            if (checkKeybind(keybinds?.save || 'Ctrl+S')) {
                e.preventDefault();
                handleSave();
            }
            if (checkKeybind(keybinds?.undo || 'Ctrl+Z')) {
                e.preventDefault();
                handleUndo();
            }
            if (checkKeybind(keybinds?.redo || 'Ctrl+Y')) {
                e.preventDefault();
                handleRedo();
            }
            if (checkKeybind(keybinds?.escape || 'Escape')) {
                e.preventDefault();
                onBack();
            }
        };

        const handleKeyUp = (e) => {
            const triggerKey = keybinds?.toolMenu || 'Tab';
            if (e.key === triggerKey) {
                setShowToolMenu(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [showToolMenu, keybinds, handleSave, handleUndo, handleRedo, onBack]);

    const checkKeybind = (e, keybind) => {
        if (!keybind) return false;

        const parts = keybind.split('+');
        const key = parts.pop();
        const modifiers = parts;

        const eventKey = e.key.toUpperCase();
        const targetKey = key.toUpperCase();

        // Check key
        if (targetKey === 'SPACE' && eventKey !== ' ') return false;
        if (targetKey !== 'SPACE' && eventKey !== targetKey) return false;

        // Check modifiers
        const ctrl = modifiers.includes('Ctrl');
        const alt = modifiers.includes('Alt');
        const shift = modifiers.includes('Shift');
        const meta = modifiers.includes('Meta');

        if (e.ctrlKey !== ctrl) return false;
        if (e.altKey !== alt) return false;
        if (e.shiftKey !== shift) return false;
        if (e.metaKey !== meta) return false;

        return true;
    };

    // Global Key Handler (Tools, Copy/Paste, Delete)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (editModal) return;

            // Tool Switching
            if (checkKeybind(e, keybinds?.toolPointer || 'V')) {
                setActiveTool('pointer');
            }
            if (checkKeybind(e, keybinds?.toolGrab || 'B')) {
                setActiveTool('grab');
            }
            if (checkKeybind(e, keybinds?.toolHelp || 'H')) {
                setActiveTool('help');
            }

            // Delete
            if (checkKeybind(e, keybinds?.delete || 'Backspace')) {
                if (selectedNodeIds.length > 0) {
                    // Filter out locked nodes
                    const nodesToRemove = selectedNodeIds.filter(id => {
                        const n = nodes.find(node => node.id === id);
                        return n && !n.locked;
                    });

                    if (nodesToRemove.length > 0) {
                        nodesToRemove.forEach(id => removeNode(id));
                        setSelectedNodeIds(selectedNodeIds.filter(id => !nodesToRemove.includes(id)));
                    }
                }
                if (selectedConnectionIds.length > 0) {
                    selectedConnectionIds.forEach(id => removeConnection(id));
                    setSelectedConnectionIds([]);
                }
            }

            // Copy
            if (checkKeybind(e, keybinds?.copy || 'Ctrl+C')) {
                e.preventDefault();
                if (selectedNodeIds.length === 0) return;

                const nodesToCopy = nodes.filter(n => selectedNodeIds.includes(n.id));
                const connectionsToCopy = connections.filter(c => selectedNodeIds.includes(c.from) && selectedNodeIds.includes(c.to));

                setClipboard({ nodes: nodesToCopy, connections: connectionsToCopy });
            }

            // Paste
            if (checkKeybind(e, keybinds?.paste || 'Ctrl+V')) {
                e.preventDefault();
                if (!clipboard) return;

                // Deselect current
                setSelectedNodeIds([]);
                setSelectedConnectionIds([]);

                const idMap = {};
                const newNodes = [];

                clipboard.nodes.forEach((node, index) => {
                    const newId = Date.now() + index + Math.floor(Math.random() * 1000);
                    idMap[node.id] = newId;

                    newNodes.push({
                        ...node,
                        id: newId,
                        x: node.x + 20,
                        y: node.y + 20,
                        locked: false
                    });
                });

                const newConnections = clipboard.connections.map((conn, index) => ({
                    ...conn,
                    id: Date.now() + index + Math.floor(Math.random() * 1000) + 50000,
                    from: idMap[conn.from],
                    to: idMap[conn.to]
                }));

                setNodes(prev => [...prev, ...newNodes]);
                setConnections(prev => [...prev, ...newConnections]);
                setSelectedNodeIds(newNodes.map(n => n.id));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keybinds, activeTool, editModal, selectedNodeIds, selectedConnectionIds, nodes, connections, clipboard]);

    const handleDocHover = (e, type, customDesc = null, customNode = null, debugInfo = null) => {
        const text = customDesc || NODE_DOCS[type];
        if (!text && !customNode && !debugInfo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const isRightSide = rect.left > window.innerWidth / 2;

        setHoverDoc({
            text,
            customNode,
            debugInfo, // Node debug info for help tool
            x: isRightSide ? rect.left - 10 : rect.right + 10,
            y: rect.top,
            align: isRightSide ? 'right' : 'left'
        });
    };

    const handleDocLeave = () => {
        setHoverDoc(null);
    };

    // Context Menu Handler
    const handleContextMenu = (e, type = null, id = null) => {
        e.preventDefault();
        e.stopPropagation();

        // Don't show context menu when modal is open
        if (editModal) return;

        // Context menu position is in screen space (relative to canvas container)
        const bounds = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        // If clicking on canvas (new node), we need world coordinates for the node
        const worldPos = screenToWorld(e.clientX, e.clientY);

        setContextMenu({
            x,
            y,
            worldX: worldPos.x,
            worldY: worldPos.y,
            type, // 'node', 'comment', or null (canvas)
            id
        });

        if (type === 'connection') {
            setSelectedConnectionIds([id]);
        } else {
            // Don't clear selection if right-clicking a node (maybe?)
            // But original code cleared it. Let's keep clearing it for now unless we are multi-selecting?
            // Actually, if I right click a node, I might want to keep connection selection?
            // But let's follow the pattern: right click usually selects the target.
            if (type !== 'node' && type !== 'comment') {
                setSelectedConnectionIds([]);
            }
        }
    };

    const closeContextMenu = () => {
        setContextMenu(null);
        // Don't clear selection on close, let user click away to clear
        // setActiveConnectionId(null); 
    };

    // Node Operations
    const addNode = (x, y, type = 'default') => {
        const newNodeId = Date.now();
        let label = 'Example Node';
        let customData = {};

        if (type.startsWith('custom-')) {
            const template = customNodeTemplates.find(t => t.id === type);
            if (template) {
                type = 'custom';
                label = template.name;

                // Create a temporary node and hydrate it (handles nested custom nodes)
                const tempNode = {
                    id: newNodeId,
                    type: 'custom',
                    templateId: template.id
                };
                const [hydratedNode] = hydrateCustomNodes([tempNode], customNodeTemplates);

                customData = {
                    templateId: hydratedNode.templateId,
                    description: hydratedNode.description,
                    category: hydratedNode.category,
                    inputs: hydratedNode.inputs,
                    outputs: hydratedNode.outputs,
                    hasInput: hydratedNode.hasInput,
                    hasOutput: hydratedNode.hasOutput,
                    inputLabel: hydratedNode.inputLabel,
                    outputLabel: hydratedNode.outputLabel,
                    internalNodes: hydratedNode.internalNodes,
                    internalConnections: hydratedNode.internalConnections
                };
            }
        }

        if (type === 'exampleTest') label = 'Example Node';

        else if (type === 'onStart') label = 'OnStart';
        else if (type === 'onClick') label = 'OnClick';
        else if (type === 'sleep') label = 'Sleep Node';
        else if (type === 'functionBlock') label = 'Function Block';

        else if (type === 'input') label = 'Input';
        else if (type === 'output') label = 'Output';

        else if (type === 'not') label = 'NOT Node';
        else if (type === 'or') label = 'OR Node';

        const newNode = {
            id: newNodeId,
            x,
            y,
            type,
            label,
            ...(type === 'functionBlock' ? { code: '', language: 'javascript', synchronize: true } : {}),
            ...(type === 'sleep' ? { sleepTime: 1000 } : {}),
            ...customData
        };
        setNodes([...nodes, newNode]);
        closeContextMenu();
    };

    const removeNode = (id) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
        closeContextMenu();
    };

    const duplicateNodes = (nodeIdsToDuplicate) => {
        const idMap = new Map();
        const newNodes = [];
        const offset = 20; // Offset for duplicated nodes

        // 1. Duplicate Nodes
        nodeIdsToDuplicate.forEach((id, index) => {
            const originalNode = nodes.find(n => n.id === id);
            if (!originalNode) return;
            if (originalNode.locked) return; // Skip locked nodes

            // Generate a unique ID. Adding index helps avoid collision if Date.now() is same
            const newId = Date.now() + index + Math.floor(Math.random() * 1000);
            idMap.set(id, newId);

            const newNode = {
                ...originalNode,
                id: newId,
                x: originalNode.x + offset,
                y: originalNode.y + offset,
            };
            newNodes.push(newNode);
        });

        // 2. Duplicate Connections (only internal to the selection)
        const newConnections = [];
        connections.forEach((conn, index) => {
            if (nodeIdsToDuplicate.includes(conn.from) && nodeIdsToDuplicate.includes(conn.to)) {
                const newFrom = idMap.get(conn.from);
                const newTo = idMap.get(conn.to);

                if (newFrom && newTo) {
                    newConnections.push({
                        ...conn,
                        id: Date.now() + index + Math.floor(Math.random() * 1000) + 10000, // Ensure unique ID
                        from: newFrom,
                        to: newTo
                    });
                }
            }
        });

        // 3. Update State
        setNodes(prev => [...prev, ...newNodes]);
        setConnections(prev => [...prev, ...newConnections]);

        // 4. Select new nodes
        setSelectedNodeIds(newNodes.map(n => n.id));
        closeContextMenu();
    };

    const openRenameNode = (id) => {
        const node = nodes.find(n => n.id === id);
        if (node.locked) return;
        setEditModal({ type: 'node-name', id, value: node?.customName || '' });
        closeContextMenu();
    };

    const openEditNode = (id) => {
        const node = nodes.find(n => n.id === id);
        if (node.locked) return;
        if (node.type === 'functionBlock') {
            setEditModal({
                type: 'function-editor',
                id,
                code: node.code || '',
                language: node.language || 'javascript',
                synchronize: node.synchronize !== undefined ? node.synchronize : true
            });
        } else if (node.type === 'sleep') {
            setEditModal({
                type: 'sleep-editor',
                id,
                sleepTime: node.sleepTime || 1000
            });
        } else {
            // console.log('Edit Node', id);
        }
        closeContextMenu();
    };

    const toggleNodeProperty = (id, prop) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, [prop]: !n[prop] } : n));
        closeContextMenu();
    };

    // Comment Operations
    const addComment = (x, y) => {
        const newComment = {
            id: Date.now(),
            x,
            y,
            width: 200,
            height: 150,
            title: 'Comment',
            description: ''
        };
        setComments([...comments, newComment]);
        closeContextMenu();
    };

    const addCommentGroup = () => {
        const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
        if (selectedNodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        selectedNodes.forEach(n => {
            let w = 200;
            let h = 100;

            // Try to get actual dimensions from DOM
            const el = nodeRefs.current[n.id];
            if (el) {
                const rect = el.getBoundingClientRect();
                w = rect.width / view.zoom;
                h = rect.height / view.zoom;
            } else {
                // Fallback estimates
                const isIO = ['input', 'output'].includes(n.type);
                const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(n.type);

                if (isIO) {
                    w = 120;
                    h = 100;
                } else if (isCompact) {
                    w = 150;
                    h = 50;
                }
            }

            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w);
            maxY = Math.max(maxY, n.y + h);
        });

        const padding = 15;
        const headerHeight = 30;

        const newComment = {
            id: Date.now(),
            title: 'Comment',
            description: '',
            x: minX - padding,
            y: minY - padding - headerHeight,
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2) + headerHeight
        };

        setComments([...comments, newComment]);
        closeContextMenu();
    };

    const removeComment = (id) => {
        setComments(comments.filter(c => c.id !== id));
        closeContextMenu();
    };

    const openRenameComment = (id) => {
        const comment = comments.find(c => c.id === id);
        setEditModal({ type: 'comment-title', id, value: comment?.title || '' });
        closeContextMenu();
    };

    const openEditCommentDesc = (id) => {
        const comment = comments.find(c => c.id === id);
        setEditModal({ type: 'comment-desc', id, value: comment?.description || '' });
        closeContextMenu();
    };

    // Zoom & Pan Logical
    const handleSidebarDragStart = (e, type) => {
        setSidebarDragType(type);
        setDragMousePos({ x: e.clientX, y: e.clientY });

        // Use a transparent image to hide the default ghost
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Sidebar Resize Logical
    const handleSidebarResizeStart = (e) => {
        e.preventDefault();
        setIsResizingSidebar(true);
    };

    useEffect(() => {
        const handleSidebarResize = (e) => {
            if (!isResizingSidebar) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 280) {
                setSidebarWidth(newWidth);
            }
        };

        const handleSidebarResizeEnd = () => {
            setIsResizingSidebar(false);
        };

        if (isResizingSidebar) {
            window.addEventListener('mousemove', handleSidebarResize);
            window.addEventListener('mouseup', handleSidebarResizeEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleSidebarResize);
            window.removeEventListener('mouseup', handleSidebarResizeEnd);
        };
    }, [isResizingSidebar]);

    const handleWheel = (e) => {
        // Don't zoom when modal is open
        if (editModal) return;

        // Always Zoom on scroll
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(view.zoom + delta, 0.1), 5);

        // Zoom towards mouse pointer
        const bounds = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - bounds.left;
        const mouseY = e.clientY - bounds.top;

        const worldX = (mouseX - view.x) / view.zoom;
        const worldY = (mouseY - view.y) / view.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        setView({ x: newX, y: newY, zoom: newZoom });
    };

    const handleCanvasMouseDown = (e) => {
        if (editModal) return;

        // Middle click always pans
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            closeContextMenu();
            return;
        }

        if (e.button === 0) { // Left click
            if (activeTool === 'grab') {
                e.preventDefault();
                setIsPanning(true);
                setPanStart({ x: e.clientX, y: e.clientY });
                closeContextMenu();
                return;
            }

            if (activeTool === 'pointer') {
                // Start selection box if clicking on canvas
                if (e.target === canvasRef.current || e.target.classList.contains('blueprint-bg')) {
                    e.preventDefault();
                    // Clear selection if not holding Ctrl
                    if (!e.ctrlKey && !e.metaKey) {
                        setSelectedNodeIds([]);
                        setSelectedConnectionIds([]);
                    }

                    const worldPos = screenToWorld(e.clientX, e.clientY);
                    setSelectionBox({
                        startX: worldPos.x,
                        startY: worldPos.y,
                        width: 0,
                        height: 0,
                        initialSelection: (e.ctrlKey || e.metaKey) ? selectedNodeIds : [],
                        initialSelectionConnections: (e.ctrlKey || e.metaKey) ? selectedConnectionIds : []
                    });
                    closeContextMenu();
                }
                return;
            }
        }
    };

    // Dragging Logical (Nodes & Comments)
    const handleNodeMouseDown = (e, id) => {
        // Don't handle node interactions when modal is open
        if (editModal) return;

        // if (activeTool === 'grab') return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const node = nodes.find(n => n.id === id);
        // if (node.locked) return; // Allow selection of locked nodes

        // Selection Logical
        let newSelectedIds = [...selectedNodeIds];
        const isSelected = newSelectedIds.includes(id);
        setWasSelectedAtMouseDown(isSelected);

        // If Ctrl is held, we handle selection differently to support drag-copy
        if (e.ctrlKey || e.metaKey) {
            if (!isSelected) {
                // If not selected, add it
                newSelectedIds.push(id);
            }
            // If already selected, we DO NOT deselect here. 
            // We wait to see if it's a click or a drag.
        } else {
            // If clicking a node that is NOT already selected, select only it
            if (!isSelected) {
                newSelectedIds = [id];
            }
            // If it IS selected, we keep the selection as is (to allow dragging the group)
        }
        setSelectedNodeIds(newSelectedIds);

        setIsDragging(true);
        setDraggedNodeId(id);
        setDragStartPos({ x: e.clientX, y: e.clientY });

        // Check for Copy Mode (Ctrl + Drag)
        if (e.ctrlKey || e.metaKey) {
            setIsCopying(true);
        } else {
            setIsCopying(false);
        }

        // Calculate offsets for all selected nodes
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const offsets = {};
        newSelectedIds.forEach(nid => {
            const n = nodes.find(node => node.id === nid);
            if (n) {
                offsets[nid] = {
                    x: worldPos.x - n.x,
                    y: worldPos.y - n.y
                };
            }
        });
        setDragOffsets(offsets);

        closeContextMenu();
    };

    const handleCommentMouseDown = (e, id) => {
        // if (activeTool === 'grab') return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        // Deselect nodes when interacting with a comment
        setSelectedNodeIds([]);

        const comment = comments.find(c => c.id === id);
        setIsDragging(true);
        setDraggedCommentId(id);

        const worldPos = screenToWorld(e.clientX, e.clientY);
        setDragOffset({
            x: worldPos.x - comment.x,
            y: worldPos.y - comment.y
        });
        closeContextMenu();
    };

    const handleCommentResizeMouseDown = (e, id) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        // Deselect nodes when resizing a comment
        setSelectedNodeIds([]);

        const comment = comments.find(c => c.id === id);
        setResizingCommentId(id);
        setResizeStart({
            w: comment.width,
            h: comment.height,
            x: e.clientX,
            y: e.clientY
        });
        closeContextMenu();
    };

    const handleMouseMove = (e) => {
        rawMousePos.current = { x: e.clientX, y: e.clientY };
        // Update mouse pos for connections (in world space)
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setMousePos(worldPos);

        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.clientX, y: e.clientY });
        } else if (selectionBox) {
            const currentWidth = worldPos.x - selectionBox.startX;
            const currentHeight = worldPos.y - selectionBox.startY;

            setSelectionBox(prev => ({
                ...prev,
                width: currentWidth,
                height: currentHeight
            }));

            // Live Selection Logical
            const x = Math.min(selectionBox.startX, selectionBox.startX + currentWidth);
            const y = Math.min(selectionBox.startY, selectionBox.startY + currentHeight);
            const w = Math.abs(currentWidth);
            const h = Math.abs(currentHeight);

            const intersectingNodes = nodes.filter(n => {
                // Use actual DOM dimensions if available
                const el = nodeRefs.current[n.id];
                let nodeW = 200;
                let nodeH = 100;

                if (el) {
                    // Get bounding rect in screen space
                    const rect = el.getBoundingClientRect();
                    // Convert width/height to world space (divide by zoom)
                    nodeW = rect.width / view.zoom;
                    nodeH = rect.height / view.zoom;
                } else {
                    // Fallback to estimated sizes
                    const isIO = ['input', 'output'].includes(n.type);
                    const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(n.type);

                    if (isIO) {
                        nodeW = 120;
                        nodeH = 120;
                    } else if (isCompact) {
                        nodeW = 150;
                        nodeH = 50;
                    }
                }

                // Check intersection
                return (
                    n.x < x + w &&
                    n.x + nodeW > x &&
                    n.y < y + h &&
                    n.y + nodeH > y
                );
            }).map(n => n.id);

            const intersectingConnections = connections.filter(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return false;

                // Calculate connection points (same Logical as rendering)
                const isCompactFrom = ['onStart', 'onClick', 'not', 'or'].includes(fromNode.type);
                const fromWidth = (['input', 'output'].includes(fromNode.type) ? 120 : (isCompactFrom ? 150 : 200));
                const x1 = fromNode.x + fromWidth - 16;

                let y1 = fromNode.y + 62;
                if (fromNode.type === 'custom' && fromNode.outputs) {
                    const index = fromNode.outputs.findIndex(o => o.id === conn.sourceHandle);
                    if (index !== -1) {
                        y1 = fromNode.y + 62 + (index * 24);
                    }
                }

                const x2 = toNode.x + 16;
                let y2 = toNode.y + 62;
                if (toNode.type === 'or' && conn.targetHandle === 'B') {
                    y2 = toNode.y + 86;
                } else if (toNode.type === 'custom' && toNode.inputs) {
                    const index = toNode.inputs.findIndex(i => i.id === conn.targetHandle);
                    if (index !== -1) {
                        y2 = toNode.y + 62 + (index * 24);
                    }
                }

                const cp1X = x1 + 30;
                const cp2X = x2 - 50;

                // Calculate bounding box of the bezier curve
                // Bezier curve is defined by P0(x1,y1), P1(cp1X,y1), P2(cp2X,y2), P3(x2,y2)
                // The curve is contained within the convex hull of control points
                const minX = Math.min(x1, cp1X, cp2X, x2);
                const maxX = Math.max(x1, cp1X, cp2X, x2);
                const minY = Math.min(y1, y2); // Control points y are same as start/end y
                const maxY = Math.max(y1, y2);

                // Add a small padding for easier selection
                const padding = 10;

                return (
                    minX - padding < x + w &&
                    maxX + padding > x &&
                    minY - padding < y + h &&
                    maxY + padding > y
                );
            }).map(c => connectionKey(c));

            const newSelection = [...new Set([...(selectionBox.initialSelection || []), ...intersectingNodes])];
            setSelectedNodeIds(newSelection);

            const newConnectionSelection = [...new Set([...(selectionBox.initialSelectionConnections || []), ...intersectingConnections])];
            setSelectedConnectionIds(newConnectionSelection);
        } else if (isDragging && draggedNodeId) {
            // Check if hovering sidebar
            const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
            const windowWidth = window.innerWidth;
            const isOver = e.clientX > (windowWidth - currentSidebarWidth);
            setIsHoveringSidebar(isOver);

            // Handle Copy on Drag (Ctrl + Drag)
            if (isCopying && dragStartPos) {
                const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
                if (dist > 5) {
                    // Perform Copy
                    const newNodes = [];
                    const newSelectedIds = [];
                    const newOffsets = {};
                    const idMap = {};

                    selectedNodeIds.forEach(oldId => {
                        const originalNode = nodes.find(n => n.id === oldId);
                        if (originalNode && !originalNode.locked) {
                            const newId = Date.now() + Math.floor(Math.random() * 1000);
                            idMap[oldId] = newId;

                            const newNode = {
                                ...originalNode,
                                id: newId,
                                // customName: originalNode.customName ? `${originalNode.customName} (Copy)` : undefined // Don't append (Copy) to match Duplicate Node behavior
                            };
                            newNodes.push(newNode);
                            newSelectedIds.push(newId);

                            if (dragOffsets[oldId]) {
                                newOffsets[newId] = dragOffsets[oldId];
                            }
                        }
                    });

                    // Copy Connections (Internal to selection)
                    const newConnections = [];
                    connections.forEach((conn, index) => {
                        if (selectedNodeIds.includes(conn.from) && selectedNodeIds.includes(conn.to)) {
                            const newFrom = idMap[conn.from];
                            const newTo = idMap[conn.to];

                            if (newFrom && newTo) {
                                newConnections.push({
                                    ...conn,
                                    id: Date.now() + index + Math.floor(Math.random() * 1000) + 20000,
                                    from: newFrom,
                                    to: newTo
                                });
                            }
                        }
                    });

                    // Update State
                    if (newNodes.length > 0) {
                        setSelectedNodeIds(newSelectedIds);
                        setDragOffsets(newOffsets);
                        if (idMap[draggedNodeId]) {
                            setDraggedNodeId(idMap[draggedNodeId]);
                        }
                        setConnections(prev => [...prev, ...newConnections]);
                    }
                    setIsCopying(false);
                    setDragStartPos(null);

                    // Add new nodes AND move them
                    if (newNodes.length > 0) {
                        setNodes(prev => {
                            const combined = [...prev, ...newNodes];
                            return combined.map(n => {
                                if (newSelectedIds.includes(n.id)) {
                                    const offset = newOffsets[n.id];
                                    if (offset) {
                                        return {
                                            ...n,
                                            x: worldPos.x - offset.x,
                                            y: worldPos.y - offset.y
                                        };
                                    }
                                }
                                return n;
                            });
                        });
                    }
                    return;
                }
            }

            setNodes(nodes.map(n => {
                if (selectedNodeIds.includes(n.id)) {
                    if (n.locked) return n; // Don't move locked nodes

                    const offset = dragOffsets[n.id];
                    if (offset) {
                        return {
                            ...n,
                            x: worldPos.x - offset.x,
                            y: worldPos.y - offset.y
                        };
                    }
                }
                return n;
            }));
        } else if (isDragging && draggedCommentId) {
            setComments(comments.map(c => {
                if (c.id === draggedCommentId) {
                    return {
                        ...c,
                        x: worldPos.x - dragOffset.x,
                        y: worldPos.y - dragOffset.y
                    };
                }
                return c;
            }));
        } else if (resizingCommentId) {
            const dx = (e.clientX - resizeStart.x) / view.zoom;
            const dy = (e.clientY - resizeStart.y) / view.zoom;
            setComments(comments.map(c => {
                if (c.id === resizingCommentId) {
                    return {
                        ...c,
                        width: Math.max(100, resizeStart.w + dx),
                        height: Math.max(50, resizeStart.h + dy)
                    };
                }
                return c;
            }));
        }
    };

    const handleMouseUp = (e) => {
        // Click Handling (Distinguish click from drag)
        if (isDragging && draggedNodeId && dragStartPos) {
            const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
            if (dist < 5) {
                // It was a click
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl + Click on Selected Node -> Deselect
                    if (wasSelectedAtMouseDown) {
                        setSelectedNodeIds(selectedNodeIds.filter(id => id !== draggedNodeId));
                    }
                } else {
                    // Normal Click on Selected Node (Group) -> Select Only This Node
                    if (wasSelectedAtMouseDown && selectedNodeIds.length > 1) {
                        setSelectedNodeIds([draggedNodeId]);
                    }
                }
            }
        }

        if (isDragging && draggedNodeId && isHoveringSidebar) {
            // Remove all selected nodes if dragging a selection to sidebar
            if (selectedNodeIds.includes(draggedNodeId)) {
                selectedNodeIds.forEach(id => removeNode(id));
                setSelectedNodeIds([]);
            } else {
                removeNode(draggedNodeId);
            }
        }

        // Finalize Selection Box
        if (selectionBox) {
            setSelectionBox(null);
        }

        setIsDragging(false);
        setIsPanning(false);
        setSelectionBox(null);
        setDraggedNodeId(null);
        setDraggedCommentId(null);
        setResizingCommentId(null);
        setConnectingNodeId(null);
        // setActiveConnectionId(null); // Don't clear selection on mouse up
        setIsHoveringSidebar(false);
        setDragOffsets({});
        setDragStartPos(null);
        setIsCopying(false);
        setSidebarDragType(null);
    };

    // Connection Logical
    const startConnection = (e, id, handleId = null) => {
        e.stopPropagation();
        setConnectingNodeId(id);
        setConnectingHandleId(handleId);
    };

    const connectionKey = (conn) => conn.id ?? `${conn.from}-${conn.to}`;

    const removeConnection = (identifier) => {
        setConnections(prev => prev.filter(c => connectionKey(c) !== identifier));
        setSelectedConnectionIds(prev => prev.filter(id => id !== identifier));
        closeContextMenu();
    };

    const setConnectionColor = (identifier, color) => {
        setConnections(connections.map(c => connectionKey(c) === identifier ? { ...c, color } : c));
        // setSelectedConnectionIds([identifier]); // Optional: select it after coloring
        closeContextMenu();
    };

    const completeConnection = (e, id, targetHandle = null) => {
        e.stopPropagation();
        if (connectingNodeId && connectingNodeId !== id) {
            // Check if connection already exists to this node and handle
            const exists = connections.some(c =>
                c.from === connectingNodeId &&
                c.to === id &&
                c.targetHandle === targetHandle &&
                c.sourceHandle === connectingHandleId
            );

            // Check if target handle is already occupied (One wire per input rule)
            const isOccupied = connections.some(c =>
                c.to === id &&
                c.targetHandle === targetHandle
            );

            if (!exists && !isOccupied) {
                setConnections([...connections, {
                    id: Date.now(),
                    from: connectingNodeId,
                    to: id,
                    targetHandle,
                    sourceHandle: connectingHandleId,
                    color: '#555'
                }]);
            }
        }
        setConnectingNodeId(null);
        setConnectingHandleId(null);
    };

    return (
        <div
            className="editor-container"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDragOver={(e) => {
                e.preventDefault();
                setDragMousePos({ x: e.clientX, y: e.clientY });
            }}
        >
            <div className="editor-header">
                <button onClick={onBack} className="back-btn">Back</button>
                <h2>{customNode ? `${customNode.name} (Custom Node)` : (workflow?.name || 'Untitled Workflow')}</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        onClick={handleSave}
                        title={`Save (${keybinds?.save || 'Ctrl+S'})`}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <img src={saveIcon} alt="Save" style={{ width: '24px', height: '24px', filter: 'invert(0.5)' }} />
                    </button>
                </div>
            </div>

            <div className="editor-body">
                {/* Runtime Info Bar */}
                {workflow?.runtime && (workflow.status === 'Online' || workflow.status === 'Idling') && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: workflow.status === 'Idling' ? 'rgba(120, 53, 15, 0.9)' : 'rgba(6, 78, 59, 0.9)',
                        color: workflow.status === 'Idling' ? '#fcd34d' : '#6ee7b7',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        <span>{workflow.status === 'Idling' ? '🟠 Idling' : '🟢 Running'}</span>
                        <span>⏱ Uptime: {Math.floor(workflow.runtime.uptime / 1000)}s</span>
                        {/* {workflow.runtime.activeSignals > 0 && (
                            <span>⚡ Active Signals: {workflow.runtime.activeSignals}</span>
                        )}
                        <span>✓ OnStart Triggered: {workflow.runtime.triggeredOnStartCount}</span> */}
                    </div>
                )}

                <div
                    className="editor-canvas"
                    ref={canvasRef}
                    style={{ cursor: activeTool === 'grab' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'help' ? 'help' : 'default' }}
                    onWheel={handleWheel}
                    onMouseDown={handleCanvasMouseDown}
                    onContextMenu={(e) => handleContextMenu(e)}
                >
                    {/* Background Grid/Dots */}
                    <div
                        className="blueprint-bg"
                        style={{
                            backgroundPosition: `${view.x}px ${view.y}px`,
                            backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`
                        }}
                    ></div>

                    {/* Transform Layer */}
                    <div
                        className="transform-layer"
                        style={{
                            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                            transformOrigin: '0 0',
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        }}
                    >
                        {/* Comments Layer (Behind everything) */}
                        {comments.map(comment => (
                            <div
                                key={comment.id}
                                className="comment-block"
                                style={{
                                    left: comment.x,
                                    top: comment.y,
                                    width: comment.width,
                                    height: comment.height
                                }}
                                onMouseDown={(e) => handleCommentMouseDown(e, comment.id)}
                                onContextMenu={(e) => handleContextMenu(e, 'comment', comment.id)}
                                onMouseEnter={() => setHoverCommentId(comment.id)}
                                onMouseLeave={() => setHoverCommentId(null)}
                            >
                                <div className="comment-header">
                                    <div className="comment-title">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 20h16" /><path d="M8 14l2-8" /><path d="M14 14l2-8" />
                                        </svg>
                                        <span>{comment.title || 'Comment'}</span>
                                    </div>
                                </div>
                                <div
                                    className="comment-resize-handle"
                                    onMouseDown={(e) => handleCommentResizeMouseDown(e, comment.id)}
                                ></div>
                            </div>
                        ))}

                        {/* Connections (SVG Layer) */}
                        <svg className="connections-layer">
                            {connections.map((conn) => {
                                const fromNode = nodes.find(n => n.id === conn.from);
                                const toNode = nodes.find(n => n.id === conn.to);
                                if (!fromNode || !toNode) return null;

                                const connKey = connectionKey(conn);

                                const isCompactFrom = ['onStart', 'onClick', 'not', 'or'].includes(fromNode.type);
                                const isCompactTo = ['onStart', 'onClick', 'not', 'or'].includes(toNode.type);

                                const fromWidth = (['input', 'output'].includes(fromNode.type) ? 120 : (isCompactFrom ? 150 : 200));
                                const x1 = fromNode.x + fromWidth - 16;

                                let y1 = fromNode.y + 62;
                                if (fromNode.type === 'custom' && fromNode.outputs) {
                                    const index = fromNode.outputs.findIndex(o => o.id === conn.sourceHandle);
                                    if (index !== -1) {
                                        y1 = fromNode.y + 62 + (index * 24);
                                    }
                                }

                                const x2 = toNode.x + 16;

                                let y2 = toNode.y + 62;
                                if (toNode.type === 'or') {
                                    if (conn.targetHandle === 'B') {
                                        y2 = toNode.y + 86;
                                    }
                                } else if (toNode.type === 'custom' && toNode.inputs) {
                                    const index = toNode.inputs.findIndex(i => i.id === conn.targetHandle);
                                    if (index !== -1) {
                                        y2 = toNode.y + 62 + (index * 24);
                                    }
                                }

                                const cp1X = x1 + 30;
                                const cp2X = x2 - 50;

                                const pathData = `M ${x1} ${y1} C ${cp1X} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`;
                                const isActive = selectedConnectionIds.includes(connKey);

                                const activeSignal = activeSignals.find(s => s.connectionId === connKey);
                                const hasActiveSignal = !!activeSignal;
                                const baseColor = conn.color || '#555';
                                const strokeColor = baseColor;
                                // Highlight wire when signal is active - stronger for pulse signals
                                const isPulse = activeSignal?.isPulse;
                                const strokeWidth = isPulse ? 5 : (hasActiveSignal ? 4 : 2);
                                const filter = isPulse
                                    ? `brightness(250%) drop-shadow(0 0 8px ${baseColor}) drop-shadow(0 0 12px ${baseColor})`
                                    : (hasActiveSignal ? `brightness(200%) drop-shadow(0 0 5px ${baseColor})` : 'none');

                                return (
                                    <g key={connKey}>
                                        {/* Hit Area */}
                                        <path
                                            d={pathData}
                                            stroke="transparent"
                                            strokeWidth="10"
                                            fill="none"
                                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                removeConnection(connKey);
                                            }}
                                            onContextMenu={(e) => handleContextMenu(e, 'connection', connKey)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (e.ctrlKey || e.metaKey) {
                                                    // Toggle selection
                                                    if (selectedConnectionIds.includes(connKey)) {
                                                        setSelectedConnectionIds(selectedConnectionIds.filter(id => id !== connKey));
                                                    } else {
                                                        setSelectedConnectionIds([...selectedConnectionIds, connKey]);
                                                    }
                                                } else {
                                                    // Single selection
                                                    setSelectedConnectionIds([connKey]);
                                                }
                                            }}
                                        />
                                        {/* Selection Highlight (Purple Outline) */}
                                        {isActive && (
                                            <path
                                                d={pathData}
                                                stroke="#9b59b6"
                                                strokeWidth="6"
                                                fill="none"
                                                style={{ pointerEvents: 'none', opacity: 0.8 }}
                                            />
                                        )}
                                        {/* Visible Line */}
                                        <path
                                            d={pathData}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            fill="none"
                                            style={{
                                                pointerEvents: 'none',
                                                transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                                                filter: filter
                                            }}
                                        />
                                    </g>
                                );
                            })}

                            {connectingNodeId && (
                                (() => {
                                    const fromNode = nodes.find(n => idEq(n.id, connectingNodeId));
                                    if (!fromNode) return null;
                                    const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(fromNode.type);

                                    const x1 = fromNode.x + (['input', 'output'].includes(fromNode.type) ? 120 : (isCompact ? 150 : 200)) - 16;
                                    let y1 = fromNode.y + 62;
                                    if (fromNode.type === 'custom' && fromNode.outputs && connectingHandleId) {
                                        const index = fromNode.outputs.findIndex(o => o.id === connectingHandleId);
                                        if (index !== -1) {
                                            y1 = fromNode.y + 62 + (index * 24);
                                        }
                                    }
                                    const x2 = mousePos.x;
                                    const y2 = mousePos.y;

                                    const cp1X = x1 + 50;
                                    const cp2X = x2 - 50;

                                    return (
                                        <path
                                            d={`M ${x1} ${y1} C ${cp1X} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`}
                                            stroke="#555"
                                            strokeWidth="2"
                                            strokeDasharray="5,5"
                                            fill="none"
                                        />
                                    );
                                })()
                            )}
                        </svg>

                        {/* Nodes */}
                        {nodes.map(node => (
                            <div
                                key={node.id}
                                ref={el => nodeRefs.current[node.id] = el}
                                className={`node ${node.type} ${node.disabled ? 'disabled' : ''} ${node.locked ? 'locked' : ''} ${selectedNodeIds.includes(node.id) ? 'selected' : ''}`}
                                style={{
                                    left: node.x,
                                    top: node.y,
                                    pointerEvents: 'auto',
                                    opacity: isDragging && selectedNodeIds.includes(node.id) ? 0 : 1
                                }}
                                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                onClick={(e) => handleNodeClick(e, node)}
                                onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                                onMouseEnter={(e) => {
                                    if (activeTool === 'help') {
                                        // Build debug info for help tool
                                        const debugInfo = {
                                            id: node.id,
                                            type: node.type,
                                            label: node.label,
                                            customName: node.customName,
                                            position: { x: Math.round(node.x), y: Math.round(node.y) },
                                            disabled: node.disabled || false,
                                            locked: node.locked || false,
                                            // Additional info based on node type
                                            ...(node.type === 'functionBlock' && {
                                                language: node.language || 'javascript',
                                                synchronize: node.synchronize !== false,
                                                codeLength: (node.code || '').length
                                            }),
                                            ...(node.type === 'sleep' && {
                                                sleepTime: node.sleepTime || 1000
                                            }),
                                            ...(node.type === 'custom' && {
                                                templateId: node.templateId,
                                                internalNodesCount: (node.internalNodes || []).length,
                                                internalConnectionsCount: (node.internalConnections || []).length
                                            })
                                        };
                                        handleDocHover(e, node.type, node.description, node.type === 'custom' ? node : null, debugInfo);
                                    }
                                }}
                                onMouseLeave={handleDocLeave}
                            >
                                {node.disabled && (
                                    <div className="node-status-icon">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="7" y1="4" x2="17" y2="20"></line>
                                            <line x1="11" y1="4" x2="21" y2="20"></line>
                                        </svg>
                                    </div>
                                )}
                                {node.locked && (
                                    <div className="node-status-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </div>
                                )}
                                {node.type !== 'input' && node.type !== 'output' && (
                                    <div className="node-header">
                                        {node.customName || node.label}
                                        {node.customName && <div className="node-sublabel">{node.label}</div>}
                                    </div>
                                )}
                                {(node.type === 'input' || node.type === 'output') && (
                                    <div className="node-header">
                                        {node.customName || node.label || (node.type === 'input' ? 'Input' : 'Output')}
                                    </div>
                                )}
                                <div className="node-body">
                                    <div className="node-ports-row">
                                        {/* Inputs */}
                                        <div className="node-io-section inputs">
                                            {node.type === 'or' ? (
                                                <>
                                                    <div className="io-port-wrapper">
                                                        <div
                                                            className="node-port input"
                                                            title="A"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onMouseUp={(e) => completeConnection(e, node.id, 'A')}
                                                        ></div>
                                                        <span className="io-label">A</span>
                                                    </div>
                                                    <div className="io-port-wrapper">
                                                        <div
                                                            className="node-port input"
                                                            title="B"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onMouseUp={(e) => completeConnection(e, node.id, 'B')}
                                                        ></div>
                                                        <span className="io-label">B</span>
                                                    </div>
                                                </>
                                            ) : node.type === 'custom' ? (
                                                node.inputs ? (
                                                    node.inputs.map((input) => (
                                                        <div key={input.id} className="io-port-wrapper">
                                                            <div
                                                                className="node-port input"
                                                                title={input.label}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onMouseUp={(e) => completeConnection(e, node.id, input.id)}
                                                            ></div>
                                                            <span className="io-label">{input.label}</span>
                                                        </div>
                                                    ))
                                                ) : node.hasInput && (
                                                    <div className="io-port-wrapper">
                                                        <div
                                                            className="node-port input"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onMouseUp={(e) => completeConnection(e, node.id)}
                                                        ></div>
                                                        <span className="io-label">{node.inputLabel || 'Input'}</span>
                                                    </div>
                                                )
                                            ) : (node.type !== 'onStart' && node.type !== 'onClick' && node.type !== 'input') && (
                                                <div className="io-port-wrapper">
                                                    <div
                                                        className="node-port input"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onMouseUp={(e) => completeConnection(e, node.id)}
                                                    ></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Outputs */}
                                        <div className="node-io-section outputs">
                                            {node.type === 'custom' ? (
                                                node.outputs ? (
                                                    node.outputs.map((output) => (
                                                        <div key={output.id} className="io-port-wrapper right">
                                                            <span className="io-label">{output.label}</span>
                                                            <div
                                                                className="node-port output"
                                                                title={output.label}
                                                                onMouseDown={(e) => startConnection(e, node.id, output.id)}
                                                            ></div>
                                                        </div>
                                                    ))
                                                ) : node.hasOutput && (
                                                    <div className="io-port-wrapper right">
                                                        <span className="io-label">{node.outputLabel || 'Output'}</span>
                                                        <div
                                                            className="node-port output"
                                                            onMouseDown={(e) => startConnection(e, node.id)}
                                                        ></div>
                                                    </div>
                                                )
                                            ) : node.type !== 'output' && (
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div
                                                        className="node-port output"
                                                        onMouseDown={(e) => startConnection(e, node.id)}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="node-content">
                                        {node.type === 'functionBlock' ? (
                                            <>
                                                {node.language === 'javascript' ? 'JavaScript' : 'Python'}
                                                {!node.synchronize && <span className="async-tag"> (async node)</span>}
                                            </>
                                        ) : node.type === 'custom' ? (
                                            null
                                        ) : node.type === 'sleep' ? (
                                            `sleeping for ${node.sleepTime || 1000} milliseconds`
                                        ) : (['input', 'output', 'onStart', 'onClick', 'not', 'or'].includes(node.type)) ? (
                                            null
                                        ) : 'Content'}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Selection Box */}
                        {selectionBox && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: Math.min(selectionBox.startX, selectionBox.startX + selectionBox.width),
                                    top: Math.min(selectionBox.startY, selectionBox.startY + selectionBox.height),
                                    width: Math.abs(selectionBox.width),
                                    height: Math.abs(selectionBox.height),
                                    border: '1px solid #9b59b6',
                                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                                    pointerEvents: 'none',
                                    zIndex: 9999
                                }}
                            />
                        )}
                    </div>

                    {/* Ghost Node for Dragging (Visible over sidebar) */}
                    {sidebarDragType && (() => {
                        let type = sidebarDragType;
                        let template = null;
                        if (type.startsWith('custom-')) {
                            template = customNodeTemplates.find(t => t.id === type);
                            type = 'custom';
                        }

                        const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(type);
                        const width = ['input', 'output'].includes(type) ? 120 : (isCompact ? 150 : 200);

                        return (
                            <div
                                className={`node dragging-ghost ${type}`}
                                style={{
                                    position: 'fixed',
                                    left: dragMousePos.x - ((width * view.zoom) / 2),
                                    top: dragMousePos.y - (20 * view.zoom),
                                    width: width,
                                    zIndex: 9999,
                                    pointerEvents: 'none',
                                    transform: `scale(${view.zoom})`,
                                    transformOrigin: 'top left'
                                }}
                            >
                                {type !== 'input' && type !== 'output' && (
                                    <div className="node-header">
                                        {type === 'exampleTest' ? 'Example Node' :
                                            type === 'onStart' ? 'OnStart' :
                                                type === 'onClick' ? 'OnClick' :
                                                    type === 'sleep' ? 'Sleep Node' :
                                                        type === 'functionBlock' ? 'Function Block' :
                                                            type === 'not' ? 'NOT Node' :
                                                                type === 'or' ? 'OR Node' :
                                                                    type === 'custom' ? (template?.name || 'Custom Node') : 'Node'}
                                    </div>
                                )}
                                {(type === 'input' || type === 'output') && (
                                    <div className="node-header">
                                        {type === 'input' ? 'Input' : 'Output'}
                                    </div>
                                )}
                                <div className="node-body">
                                    <div className="node-ports-row">
                                        {/* Inputs */}
                                        <div className="node-io-section inputs">
                                            {type === 'or' ? (
                                                <>
                                                    <div className="io-port-wrapper">
                                                        <div className="node-port input"></div>
                                                        <span className="io-label">A</span>
                                                    </div>
                                                    <div className="io-port-wrapper">
                                                        <div className="node-port input"></div>
                                                        <span className="io-label">B</span>
                                                    </div>
                                                </>
                                            ) : type === 'custom' ? (
                                                template?.inputs ? (
                                                    template.inputs.map((input) => (
                                                        <div key={input.id} className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{input.label}</span>
                                                        </div>
                                                    ))
                                                ) : template?.hasInput && (
                                                    <div className="io-port-wrapper">
                                                        <div className="node-port input"></div>
                                                        <span className="io-label">{template.inputLabel || 'Input'}</span>
                                                    </div>
                                                )
                                            ) : (type !== 'onStart' && type !== 'onClick' && type !== 'input') && (
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Outputs */}
                                        <div className="node-io-section outputs">
                                            {type === 'custom' ? (
                                                template?.outputs ? (
                                                    template.outputs.map((output) => (
                                                        <div key={output.id} className="io-port-wrapper right">
                                                            <span className="io-label">{output.label}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    ))
                                                ) : template?.hasOutput && (
                                                    <div className="io-port-wrapper right">
                                                        <span className="io-label">{template.outputLabel || 'Output'}</span>
                                                        <div className="node-port output"></div>
                                                    </div>
                                                )
                                            ) : type !== 'output' && (
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="node-content">
                                        {type === 'functionBlock' ? 'JavaScript' :
                                            type === 'sleep' ? 'sleeping for 1000 milliseconds' :
                                                type === 'exampleTest' ? 'Content' :
                                                    ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {isDragging && draggedNodeId && !sidebarDragType && (() => {
                        return selectedNodeIds.map(id => {
                            const node = nodes.find(n => n.id === id);
                            if (!node) return null;

                            // Calculate screen position for the ghost node
                            const screenPos = worldToScreen(node.x, node.y);
                            const bounds = canvasRef.current ? canvasRef.current.getBoundingClientRect() : { left: 0, top: 0 };

                            const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(node.type);

                            return (
                                <div
                                    key={`ghost-${id}`}
                                    className={`node dragging-ghost ${node.type} ${isHoveringSidebar ? 'deleting' : ''} ${node.disabled ? 'disabled' : ''} ${node.locked ? 'locked' : ''} ${selectedNodeIds.includes(node.id) ? 'selected' : ''}`}
                                    style={{
                                        position: 'fixed',
                                        left: screenPos.x + bounds.left,
                                        top: screenPos.y + bounds.top,
                                        width: ['input', 'output'].includes(node.type) ? 120 : (isCompact ? 150 : 200),
                                        zIndex: 9999,
                                        pointerEvents: 'none',
                                        transform: `scale(${view.zoom})`,
                                        transformOrigin: 'top left'
                                    }}
                                >
                                    {node.disabled && (
                                        <div className="node-status-icon">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="7" y1="4" x2="17" y2="20"></line>
                                                <line x1="11" y1="4" x2="21" y2="20"></line>
                                            </svg>
                                        </div>
                                    )}
                                    {node.locked && (
                                        <div className="node-status-icon">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                        </div>
                                    )}
                                    {isHoveringSidebar && (
                                        <div className="node-delete-overlay">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                        </div>
                                    )}
                                    {node.type !== 'input' && node.type !== 'output' && (
                                        <div className="node-header">
                                            {node.customName || node.label}
                                            {node.customName && <div className="node-sublabel">{node.label}</div>}
                                        </div>
                                    )}
                                    {(node.type === 'input' || node.type === 'output') && (
                                        <div className="node-header">
                                            {node.customName || node.label || (node.type === 'input' ? 'Input' : 'Output')}
                                        </div>
                                    )}
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            {/* Inputs */}
                                            <div className="node-io-section inputs">
                                                {node.type === 'or' ? (
                                                    <>
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input" title="A"></div>
                                                            <span className="io-label">A</span>
                                                        </div>
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input" title="B"></div>
                                                            <span className="io-label">B</span>
                                                        </div>
                                                    </>
                                                ) : node.type === 'custom' ? (
                                                    node.inputs ? (
                                                        node.inputs.map((input) => (
                                                            <div key={input.id} className="io-port-wrapper">
                                                                <div className="node-port input"></div>
                                                                <span className="io-label">{input.label}</span>
                                                            </div>
                                                        ))
                                                    ) : node.hasInput && (
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{node.inputLabel || 'Input'}</span>
                                                        </div>
                                                    )
                                                ) : (node.type !== 'onStart' && node.type !== 'onClick' && node.type !== 'input') && (
                                                    <div className="io-port-wrapper">
                                                        <div className="node-port input"></div>
                                                        <span className="io-label">Input</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Outputs */}
                                            <div className="node-io-section outputs">
                                                {node.type === 'custom' ? (
                                                    node.outputs ? (
                                                        node.outputs.map((output) => (
                                                            <div key={output.id} className="io-port-wrapper right">
                                                                <span className="io-label">{output.label}</span>
                                                                <div className="node-port output"></div>
                                                            </div>
                                                        ))
                                                    ) : node.hasOutput && (
                                                        <div className="io-port-wrapper right">
                                                            <span className="io-label">{node.outputLabel || 'Output'}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    )
                                                ) : node.type !== 'output' && (
                                                    <div className="io-port-wrapper right">
                                                        <span className="io-label">Output</span>
                                                        <div className="node-port output"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="node-content">
                                            {node.type === 'functionBlock' ? (
                                                <>
                                                    {node.language === 'javascript' ? 'JavaScript' : 'Python'}
                                                    {!node.synchronize && <span className="async-tag"> (async node)</span>}
                                                </>
                                            ) : node.type === 'sleep' ? (
                                                `sleeping for ${node.sleepTime || 1000} milliseconds`
                                            ) : (node.type === 'input' || node.type === 'output') ? (
                                                ''
                                            ) : (['onStart', 'onClick', 'not', 'or'].includes(node.type)) ? (
                                                null
                                            ) : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}

                    {/* Context Menu (Outside Transform Layer) */}
                    {contextMenu && (
                        <div
                            className="context-menu-wrapper"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="context-menu">
                                {contextMenu.type === 'node' ? (
                                    (() => {
                                        const node = nodes.find(n => n.id === contextMenu.id);
                                        if (!node) return null;

                                        // Multi-select Context Menu
                                        if (selectedNodeIds.includes(contextMenu.id) && selectedNodeIds.length > 1) {
                                            const allLocked = selectedNodeIds.every(id => nodes.find(n => n.id === id)?.locked);
                                            const allDisabled = selectedNodeIds.every(id => nodes.find(n => n.id === id)?.disabled);

                                            return (
                                                <>
                                                    <div onClick={() => {
                                                        setNodes(nodes.map(n => selectedNodeIds.includes(n.id) ? { ...n, locked: !allLocked } : n));
                                                        closeContextMenu();
                                                    }}>
                                                        {allLocked ? 'Unlock Nodes' : 'Lock Nodes'}
                                                    </div>
                                                    <div onClick={() => {
                                                        setNodes(nodes.map(n => selectedNodeIds.includes(n.id) ? { ...n, disabled: !allDisabled } : n));
                                                        closeContextMenu();
                                                    }}>
                                                        {allDisabled ? 'Enable Nodes' : 'Disable Nodes'}
                                                    </div>
                                                    <div onClick={addCommentGroup}>
                                                        Add Comment Group
                                                    </div>
                                                    <div onClick={() => {
                                                        setEditModal({
                                                            type: 'create-custom-node',
                                                            name: '',
                                                            description: '',
                                                            category: 'Custom'
                                                        });
                                                        closeContextMenu();
                                                    }}>
                                                        Create Custom Node
                                                    </div>
                                                    {!allLocked && (
                                                        <>
                                                            <div onClick={() => duplicateNodes(selectedNodeIds)}>
                                                                Duplicate Nodes
                                                            </div>
                                                            <div onClick={() => {
                                                                // Remove only unlocked nodes
                                                                const nodesToRemove = selectedNodeIds.filter(id => {
                                                                    const n = nodes.find(node => node.id === id);
                                                                    return n && !n.locked;
                                                                });

                                                                if (nodesToRemove.length > 0) {
                                                                    setNodes(nodes.filter(n => !nodesToRemove.includes(n.id)));
                                                                    setConnections(connections.filter(c => !nodesToRemove.includes(c.from) && !nodesToRemove.includes(c.to)));
                                                                    setSelectedNodeIds(selectedNodeIds.filter(id => !nodesToRemove.includes(id)));
                                                                }
                                                                closeContextMenu();
                                                            }}>
                                                                Remove Nodes
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        }

                                        // Single Node Context Menu
                                        const canEdit = !['onStart', 'onClick', 'input', 'output', 'not', 'or'].includes(node.type);
                                        return (
                                            <>
                                                {!node.locked && (
                                                    <>
                                                        <div onClick={() => openRenameNode(contextMenu.id)}>Rename</div>
                                                        {canEdit && <div onClick={() => openEditNode(contextMenu.id)}>Edit Node</div>}
                                                        <div onClick={() => duplicateNodes([contextMenu.id])}>Duplicate Node</div>
                                                    </>
                                                )}
                                                <div onClick={() => toggleNodeProperty(contextMenu.id, 'disabled')}>
                                                    {node.disabled ? 'Enable Node' : 'Disable Node'}
                                                </div>
                                                <div onClick={() => toggleNodeProperty(contextMenu.id, 'locked')}>
                                                    {node.locked ? 'Unlock Node' : 'Lock Node'}
                                                </div>
                                                {!node.locked && <div onClick={() => removeNode(contextMenu.id)}>Remove Node</div>}
                                            </>
                                        );
                                    })()
                                ) : contextMenu.type === 'comment' ? (
                                    <>
                                        <div onClick={() => openRenameComment(contextMenu.id)}>Rename</div>
                                        <div onClick={() => openEditCommentDesc(contextMenu.id)}>Write Description</div>
                                        <div onClick={() => removeComment(contextMenu.id)}>Remove Comment</div>
                                    </>
                                ) : contextMenu.type === 'connection' ? (
                                    <>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#555')}>Reset</div>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#882e24ff')}>Red</div>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#947809ff')}>Yellow</div>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#20947dff')}>Aqua</div>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#1e5f8aff')}>Blue</div>
                                        <div onClick={() => setConnectionColor(contextMenu.id, '#1b7e44ff')}>Green</div>
                                        <div onClick={() => removeConnection(contextMenu.id)}>Remove Line</div>
                                    </>
                                ) : (
                                    <>
                                        <div onClick={() => addComment(contextMenu.worldX, contextMenu.worldY)}>Add Comment</div>
                                    </>
                                )}
                            </div>

                            {/* Floating Tool Switcher (Only for canvas context menu) */}
                            {!contextMenu.type && (
                                <div className="context-tools">
                                    <div
                                        className={`tool-option ${activeTool === 'pointer' ? 'active' : ''}`}
                                        onClick={() => { setActiveTool('pointer'); closeContextMenu(); }}
                                        title="Pointer"
                                    >
                                        <img src={pointerIcon} alt="Pointer" />
                                    </div>
                                    <div
                                        className={`tool-option ${activeTool === 'grab' ? 'active' : ''}`}
                                        onClick={() => { setActiveTool('grab'); closeContextMenu(); }}
                                        title="Grab"
                                    >
                                        <img src={grabIcon} alt="Grab" />
                                    </div>
                                    <div
                                        className={`tool-option ${activeTool === 'help' ? 'active' : ''}`}
                                        onClick={() => { setActiveTool('help'); closeContextMenu(); }}
                                        title="Help"
                                    >
                                        <img src={helpIcon} alt="Help" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tool Menu (Floating) */}
                    {showToolMenu && (
                        <div
                            className="tool-menu"
                            style={{
                                position: 'fixed',
                                left: toolMenuPos.x,
                                top: toolMenuPos.y,
                                zIndex: 10000
                            }}
                        >
                            <div
                                className={`tool-option ${activeTool === 'pointer' ? 'active' : ''}`}
                                onMouseEnter={() => setActiveTool('pointer')}
                                onClick={() => setActiveTool('pointer')}
                                title="Pointer Tool"
                            >
                                <img src={pointerIcon} alt="Pointer" width="24" height="24" />
                            </div>
                            <div
                                className={`tool-option ${activeTool === 'grab' ? 'active' : ''}`}
                                onMouseEnter={() => setActiveTool('grab')}
                                onClick={() => setActiveTool('grab')}
                                title="Grab Tool"
                            >
                                <img src={grabIcon} alt="Grab" width="24" height="24" />
                            </div>
                            <div
                                className={`tool-option ${activeTool === 'help' ? 'active' : ''}`}
                                onMouseEnter={() => setActiveTool('help')}
                                onClick={() => setActiveTool('help')}
                                title="Help Tool"
                            >
                                <img src={helpIcon} alt="Help" width="24" height="24" />
                            </div>
                        </div>
                    )}

                    {/* Comment Tooltip (Outside transform to avoid scaling) */}
                    {hoverCommentId && (() => {
                        const comment = comments.find(c => c.id === hoverCommentId);
                        if (!comment) return null;

                        const simpleMarkdown = (text) => {
                            if (!text) return '';
                            return text
                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                .replace(/`(.+?)`/g, '<code>$1</code>')
                                .replace(/\n/g, '<br/>');
                        };

                        const screenPos = worldToScreen(comment.x + comment.width, comment.y);

                        return (
                            <div
                                className="comment-tooltip"
                                style={{
                                    left: screenPos.x + 8,
                                    top: screenPos.y,
                                    pointerEvents: 'none'
                                }}
                                dangerouslySetInnerHTML={{ __html: `<div class=\"tooltip-title\">${comment.title || 'Comment'}</div><div class=\"tooltip-body\">${simpleMarkdown(comment.description || 'No description')}</div>` }}
                            />
                        );
                    })()}

                    {editModal && (
                        <div className="modal-backdrop">
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>
                                        {editModal.type === 'node-name' && 'Rename Node'}
                                        {editModal.type === 'comment-title' && 'Rename Comment'}
                                        {editModal.type === 'comment-desc' && 'Edit Comment Description'}
                                        {editModal.type === 'function-editor' && 'Edit Function Block'}
                                        {editModal.type === 'sleep-editor' && 'Edit Sleep Node'}
                                        {editModal.type === 'create-custom-node' && 'Create Custom Node'}
                                    </h3>
                                    <button className="modal-close" onClick={() => setEditModal(null)}>✕</button>
                                </div>
                                <div className="modal-body">
                                    {editModal.type === 'create-custom-node' ? (
                                        <div className="custom-node-form">
                                            <div className="form-group">
                                                <label>Node Name:</label>
                                                <input
                                                    maxLength={16}
                                                    value={editModal.name}
                                                    onChange={(e) => setEditModal({ ...editModal, name: e.target.value, error: null })}
                                                    placeholder="My Custom Node"
                                                />
                                                {editModal.error && (
                                                    <div style={{ display: 'flex', alignItems: 'center', color: '#ff4444', marginTop: '5px', fontSize: '0.9rem' }}>
                                                        <img src={warningIcon} alt="Warning" style={{ width: '16px', height: '16px', marginRight: '5px' }} />
                                                        {editModal.error}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label>Description:</label>
                                                <textarea
                                                    value={editModal.description}
                                                    onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                                                    placeholder="What does this node do?"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Category:</label>
                                                <select
                                                    value={editModal.category}
                                                    onChange={(e) => setEditModal({ ...editModal, category: e.target.value })}
                                                >
                                                    <option value="Custom">Custom</option>
                                                    <option value="Logical">Logical</option>
                                                    <option value="IO Interface">IO Interface</option>
                                                    <option value="Utilities">Utilities</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : editModal.type === 'node-name' || editModal.type === 'comment-title' ? (
                                        <div style={{ width: '100%' }}>
                                            <input
                                                autoFocus
                                                maxLength={24}
                                                value={editModal.value}
                                                onChange={(e) => setEditModal({ ...editModal, value: e.target.value, error: null })}
                                                placeholder="New name"
                                                style={{ width: '100%' }}
                                            />
                                            {editModal.error && (
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#ff4444', marginTop: '8px', fontSize: '0.9rem' }}>
                                                    <img src={warningIcon} alt="Warning" style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                                                    {editModal.error}
                                                </div>
                                            )}
                                        </div>
                                    ) : editModal.type === 'sleep-editor' ? (
                                        <div className="form-group">
                                            <label>Sleep Duration (ms):</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editModal.sleepTime}
                                                onChange={(e) => setEditModal({ ...editModal, sleepTime: parseInt(e.target.value) || 0 })}
                                                placeholder="Milliseconds"
                                            />
                                        </div>
                                    ) : editModal.type === 'function-editor' ? (
                                        <div className="code-editor-form">
                                            <div className="form-group">
                                                <label>Language:</label>
                                                <div className="radio-group">
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            name="language"
                                                            value="javascript"
                                                            checked={editModal.language === 'javascript'}
                                                            onChange={(e) => setEditModal({ ...editModal, language: e.target.value })}
                                                        /> JavaScript
                                                    </label>
                                                    <label>
                                                        <input
                                                            type="radio"
                                                            name="language"
                                                            value="python"
                                                            checked={editModal.language === 'python'}
                                                            onChange={(e) => setEditModal({ ...editModal, language: e.target.value })}
                                                        /> Python
                                                    </label>
                                                </div>
                                            </div>
                                            <CodeEditor
                                                value={editModal.code}
                                                onChange={(code) => setEditModal({ ...editModal, code })}
                                                language={editModal.language}
                                                autoCompleteDelay={Math.max(0, editorSettings?.autoCompleteDelay ?? 50)}
                                                triggerKey={keybinds?.codeCompletion || 'Ctrl+Space'}
                                                theme={theme}
                                            />
                                            <div className="form-group">
                                                <label
                                                    style={{ justifyContent: 'flex-start', cursor: 'help', width: 'fit-content' }}
                                                    onMouseEnter={(e) => handleDocHover(e, 'synchronizeOption')}
                                                    onMouseLeave={handleDocLeave}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={editModal.synchronize}
                                                        onChange={(e) => setEditModal({ ...editModal, synchronize: e.target.checked })}
                                                    /> Synchronize Node
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            autoFocus
                                            value={editModal.value}
                                            onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
                                            placeholder="Explain about it"
                                        />
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button onClick={() => setEditModal(null)}>Cancel</button>
                                    <button
                                        className="primary"
                                        onClick={() => {
                                            const trimmed = typeof editModal.value === 'string' ? editModal.value.trim() : '';
                                            if (editModal.type === 'node-name') {
                                                if (trimmed) {
                                                    const isDuplicate = nodes.some(n => n.id !== editModal.id && (n.customName === trimmed || (!n.customName && n.label === trimmed)));
                                                    if (isDuplicate) {
                                                        setEditModal({ ...editModal, error: 'Node name must be unique.' });
                                                        return;
                                                    }
                                                }
                                                setNodes(nodes.map(n => n.id === editModal.id ? { ...n, customName: trimmed || undefined } : n));
                                            } else if (editModal.type === 'comment-title') {
                                                setComments(comments.map(c => c.id === editModal.id ? { ...c, title: trimmed || 'Comment' } : c));
                                            } else if (editModal.type === 'comment-desc') {
                                                setComments(comments.map(c => c.id === editModal.id ? { ...c, description: editModal.value } : c));
                                            } else if (editModal.type === 'function-editor') {
                                                setNodes(nodes.map(n => n.id === editModal.id ? {
                                                    ...n,
                                                    code: editModal.code,
                                                    language: editModal.language,
                                                    synchronize: editModal.synchronize
                                                } : n));
                                            } else if (editModal.type === 'sleep-editor') {
                                                setNodes(nodes.map(n => n.id === editModal.id ? {
                                                    ...n,
                                                    sleepTime: editModal.sleepTime
                                                } : n));
                                            } else if (editModal.type === 'create-custom-node') {
                                                const newName = (editModal.name || 'Custom Node').trim();
                                                const isDuplicate = nodes.some(n => (n.customName || n.label) === newName);
                                                if (isDuplicate) {
                                                    setEditModal({ ...editModal, error: 'Node name must be unique.' });
                                                    return;
                                                }
                                                const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
                                                if (selectedNodes.length > 0) {
                                                    const minX = Math.min(...selectedNodes.map(n => n.x));
                                                    const maxX = Math.max(...selectedNodes.map(n => n.x + (['input', 'output'].includes(n.type) ? 120 : 200)));
                                                    const minY = Math.min(...selectedNodes.map(n => n.y));
                                                    const maxY = Math.max(...selectedNodes.map(n => n.y + 100));

                                                    const centerX = minX + (maxX - minX) / 2;
                                                    const centerY = minY + (maxY - minY) / 2;

                                                    const inputNodes = selectedNodes.filter(n => n.type === 'input').sort((a, b) => a.y - b.y);
                                                    const outputNodes = selectedNodes.filter(n => n.type === 'output').sort((a, b) => a.y - b.y);

                                                    const newNode = {
                                                        id: Date.now(),
                                                        type: 'custom',
                                                        x: centerX - 100,
                                                        y: centerY - 50,
                                                        label: editModal.name || 'Custom Node',
                                                        description: editModal.description,
                                                        category: editModal.category,
                                                        inputs: inputNodes.map(n => ({ id: n.id, label: n.customName || n.label || 'Input' })),
                                                        outputs: outputNodes.map(n => ({ id: n.id, label: n.customName || n.label || 'Output' })),
                                                        internalNodes: selectedNodes,
                                                        internalConnections: connections.filter(c => selectedNodeIds.includes(c.from) && selectedNodeIds.includes(c.to))
                                                    };

                                                    // Clean internal nodes for template (Strip redundant data from nested custom nodes)
                                                    const cleanInternalNodes = newNode.internalNodes.map(n => {
                                                        if (n.type === 'custom') {
                                                            const {
                                                                internalNodes,
                                                                internalConnections,
                                                                inputs,
                                                                outputs,
                                                                description,
                                                                category,
                                                                hasInput,
                                                                hasOutput,
                                                                inputLabel,
                                                                outputLabel,
                                                                ...rest
                                                            } = n;
                                                            return rest;
                                                        }
                                                        return n;
                                                    });

                                                    // Save as Template
                                                    const newTemplate = {
                                                        id: `custom-${Date.now()}`,
                                                        name: newNode.label,
                                                        description: newNode.description,
                                                        category: newNode.category,
                                                        inputs: newNode.inputs,
                                                        outputs: newNode.outputs,
                                                        internalNodes: cleanInternalNodes,
                                                        internalConnections: newNode.internalConnections
                                                    };
                                                    setCustomNodeTemplates(prev => [...prev, newTemplate]);

                                                    // Save to Server
                                                    fetch('/api/nodes', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify(newTemplate),
                                                    })
                                                        .then(response => {
                                                            if (!response.ok) {
                                                                throw new Error('Network response was not ok');
                                                            }
                                                            return response.json();
                                                        })
                                                        .then(data => {
                                                            // console.log('Custom node saved:', data);
                                                        })
                                                        .catch(error => {
                                                            console.error('Error saving custom node:', error);
                                                            alert('Failed to save custom node to server');
                                                        });

                                                    const newNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));
                                                    newNodes.push({ ...newNode, templateId: newTemplate.id });

                                                    const newConnections = connections.filter(c => !selectedNodeIds.includes(c.from) || !selectedNodeIds.includes(c.to))
                                                        .map(conn => {
                                                            // Remap connections to the new custom node
                                                            // If connection was to an internal input node, map to custom node with targetHandle = inputNode.id
                                                            const targetInput = inputNodes.find(n => n.id === conn.to);
                                                            if (targetInput) return { ...conn, to: newNode.id, targetHandle: targetInput.id };

                                                            // If connection was from an internal output node, map from custom node with sourceHandle = outputNode.id
                                                            const sourceOutput = outputNodes.find(n => n.id === conn.from);
                                                            if (sourceOutput) return { ...conn, from: newNode.id, sourceHandle: sourceOutput.id };

                                                            return conn;
                                                        })
                                                        .filter(conn => {
                                                            const fromExists = newNodes.find(n => n.id === conn.from);
                                                            const toExists = newNodes.find(n => n.id === conn.to);
                                                            return fromExists && toExists;
                                                        });

                                                    setNodes(newNodes);
                                                    setConnections(newConnections);
                                                    setSelectedNodeIds([newNode.id]);
                                                }
                                            }
                                            setEditModal(null);
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div
                    className={`editor-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isResizingSidebar ? 'resizing' : ''}`}
                    style={{ width: sidebarCollapsed ? 40 : sidebarWidth }}
                >
                    {!sidebarCollapsed && (
                        <div
                            className="sidebar-resize-handle"
                            onMouseDown={handleSidebarResizeStart}
                        />
                    )}
                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        {sidebarCollapsed ? '<<' : '>>'}
                    </button>
                    {!sidebarCollapsed && (
                        <div className="sidebar-content">
                            <h3>Utility</h3>
                            <div className="tools-grid">
                                {customNodeTemplates.filter(t => t.category === 'Utility').map(template => (
                                    <div
                                        key={template.id}
                                        className="node"
                                        draggable
                                        style={{ position: 'relative', cursor: 'grab' }}
                                        onMouseEnter={(e) => handleDocHover(e, 'custom', template.description)}
                                        onMouseLeave={handleDocLeave}
                                        onDragStart={(e) => handleSidebarDragStart(e, template.id)}
                                        onDragEnd={(e) => {
                                            setSidebarDragType(null);
                                            const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                            if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                            const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                            addNode(worldPos.x, worldPos.y, template.id);
                                        }}
                                    >
                                        <div className="node-header">{template.name}</div>
                                        <div className="node-body">
                                            <div className="node-ports-row">
                                                <div className="node-io-section inputs">
                                                    {template.hasInput && (
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{template.inputLabel || 'Input'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="node-io-section outputs">
                                                    {template.hasOutput && (
                                                        <div className="io-port-wrapper right">
                                                            <span className="io-label">{template.outputLabel || 'Output'}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="node-content"></div>
                                        </div>
                                    </div>
                                ))}
                                <div
                                    className="node"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'exampleTest')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'exampleTest')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'exampleTest');
                                    }}
                                >
                                    <div className="node-header">Example Node</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="node-content">Content</div>
                                    </div>
                                </div>

                                <div
                                    className="node onStart"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'onStart')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'onStart')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (75 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'onStart');
                                    }}
                                >
                                    <div className="node-header">OnStart</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs"></div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="node onClick"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'onClick')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'onClick')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (75 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'onClick');
                                    }}
                                >
                                    <div className="node-header">OnClick</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs"></div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="node"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'sleep')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'sleep')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'sleep');
                                    }}
                                >
                                    <div className="node-header">Sleep Node</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="node-content">sleeping for 1000 milliseconds</div>
                                    </div>
                                </div>
                                <div
                                    className="node functionBlock"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'functionBlock')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'functionBlock')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'functionBlock');
                                    }}
                                >
                                    <div className="node-header">Function Block</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="node-content">JavaScript</div>
                                    </div>
                                </div>
                            </div>

                            <br />
                            <h3>IO Interface</h3>
                            <div className="tools-grid">
                                {customNodeTemplates.filter(t => t.category === 'IO Interface').map(template => (
                                    <div
                                        key={template.id}
                                        className="node"
                                        draggable
                                        style={{ position: 'relative', cursor: 'grab' }}
                                        onMouseEnter={(e) => handleDocHover(e, 'custom', template.description)}
                                        onMouseLeave={handleDocLeave}
                                        onDragStart={(e) => handleSidebarDragStart(e, template.id)}
                                        onDragEnd={(e) => {
                                            setSidebarDragType(null);
                                            const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                            if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                            const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                            addNode(worldPos.x, worldPos.y, template.id);
                                        }}
                                    >
                                        <div className="node-header">{template.name}</div>
                                        <div className="node-body">
                                            <div className="node-ports-row">
                                                <div className="node-io-section inputs">
                                                    {template.inputs ? (
                                                        template.inputs.map((input) => (
                                                            <div key={input.id} className="io-port-wrapper">
                                                                <div className="node-port input"></div>
                                                                <span className="io-label">{input.label}</span>
                                                            </div>
                                                        ))
                                                    ) : template.hasInput && (
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{template.inputLabel || 'Input'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="node-io-section outputs">
                                                    {template.outputs ? (
                                                        template.outputs.map((output) => (
                                                            <div key={output.id} className="io-port-wrapper right">
                                                                <span className="io-label">{output.label}</span>
                                                                <div className="node-port output"></div>
                                                            </div>
                                                        ))
                                                    ) : template.hasOutput && (
                                                        <div className="io-port-wrapper right">
                                                            <span className="io-label">{template.outputLabel || 'Output'}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="node-content"></div>
                                        </div>
                                    </div>
                                ))}
                                <div
                                    className="node input"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'input')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'input')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (60 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'input');
                                    }}
                                >
                                    <div className="node-header">Input</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs"></div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="node output"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'output')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'output')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (60 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'output');
                                    }}
                                >
                                    <div className="node-header">Output</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <br />
                            <h3>Logical</h3>
                            <div className="tools-grid">
                                {customNodeTemplates.filter(t => t.category === 'Logical').map(template => (
                                    <div
                                        key={template.id}
                                        className="node"
                                        draggable
                                        style={{ position: 'relative', cursor: 'grab' }}
                                        onMouseEnter={(e) => handleDocHover(e, 'custom', template.description)}
                                        onMouseLeave={handleDocLeave}
                                        onDragStart={(e) => handleSidebarDragStart(e, template.id)}
                                        onDragEnd={(e) => {
                                            setSidebarDragType(null);
                                            const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                            if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                            const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                            addNode(worldPos.x, worldPos.y, template.id);
                                        }}
                                    >
                                        <div className="node-header">{template.name}</div>
                                        <div className="node-body">
                                            <div className="node-ports-row">
                                                <div className="node-io-section inputs">
                                                    {template.inputs ? (
                                                        template.inputs.map((input) => (
                                                            <div key={input.id} className="io-port-wrapper">
                                                                <div className="node-port input"></div>
                                                                <span className="io-label">{input.label}</span>
                                                            </div>
                                                        ))
                                                    ) : template.hasInput && (
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{template.inputLabel || 'Input'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="node-io-section outputs">
                                                    {template.outputs ? (
                                                        template.outputs.map((output) => (
                                                            <div key={output.id} className="io-port-wrapper right">
                                                                <span className="io-label">{output.label}</span>
                                                                <div className="node-port output"></div>
                                                            </div>
                                                        ))
                                                    ) : template.hasOutput && (
                                                        <div className="io-port-wrapper right">
                                                            <span className="io-label">{template.outputLabel || 'Output'}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="node-content"></div>
                                        </div>
                                    </div>
                                ))}
                                <div
                                    className="node not"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'not')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'not')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (75 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'not');
                                    }}
                                >
                                    <div className="node-header">NOT Node</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">Input</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="node or"
                                    draggable
                                    style={{ position: 'relative', cursor: 'grab' }}
                                    onMouseEnter={(e) => handleDocHover(e, 'or')}
                                    onMouseLeave={handleDocLeave}
                                    onDragStart={(e) => handleSidebarDragStart(e, 'or')}
                                    onDragEnd={(e) => {
                                        setSidebarDragType(null);
                                        const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                        if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                        const worldPos = screenToWorld(e.clientX - (75 * view.zoom), e.clientY - (20 * view.zoom));
                                        addNode(worldPos.x, worldPos.y, 'or');
                                    }}
                                >
                                    <div className="node-header">OR Node</div>
                                    <div className="node-body">
                                        <div className="node-ports-row">
                                            <div className="node-io-section inputs">
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">A</span>
                                                </div>
                                                <div className="io-port-wrapper">
                                                    <div className="node-port input"></div>
                                                    <span className="io-label">B</span>
                                                </div>
                                            </div>
                                            <div className="node-io-section outputs">
                                                <div className="io-port-wrapper right">
                                                    <span className="io-label">Output</span>
                                                    <div className="node-port output"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <br />
                            <h3>Custom</h3>
                            <div className="tools-grid">
                                {customNodeTemplates.filter(t => t.category === 'Custom').map(template => (
                                    <div
                                        key={template.id}
                                        className="node"
                                        draggable
                                        style={{ position: 'relative', cursor: 'grab' }}
                                        onMouseEnter={(e) => handleDocHover(e, 'custom', template.description)}
                                        onMouseLeave={handleDocLeave}
                                        onDragStart={(e) => handleSidebarDragStart(e, template.id)}
                                        onDragEnd={(e) => {
                                            setSidebarDragType(null);
                                            const currentSidebarWidth = sidebarCollapsed ? 40 : sidebarWidth;
                                            if (e.clientX > window.innerWidth - currentSidebarWidth) return;
                                            const worldPos = screenToWorld(e.clientX - (100 * view.zoom), e.clientY - (20 * view.zoom));
                                            addNode(worldPos.x, worldPos.y, template.id);
                                        }}
                                    >
                                        <div className="node-header">{template.name}</div>
                                        <div className="node-body">
                                            <div className="node-ports-row">
                                                <div className="node-io-section inputs">
                                                    {template.inputs ? (
                                                        template.inputs.map((input) => (
                                                            <div key={input.id} className="io-port-wrapper">
                                                                <div className="node-port input"></div>
                                                                <span className="io-label">{input.label}</span>
                                                            </div>
                                                        ))
                                                    ) : template.hasInput && (
                                                        <div className="io-port-wrapper">
                                                            <div className="node-port input"></div>
                                                            <span className="io-label">{template.inputLabel || 'Input'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="node-io-section outputs">
                                                    {template.outputs ? (
                                                        template.outputs.map((output) => (
                                                            <div key={output.id} className="io-port-wrapper right">
                                                                <span className="io-label">{output.label}</span>
                                                                <div className="node-port output"></div>
                                                            </div>
                                                        ))
                                                    ) : template.hasOutput && (
                                                        <div className="io-port-wrapper right">
                                                            <span className="io-label">{template.outputLabel || 'Output'}</span>
                                                            <div className="node-port output"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="node-content"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Node Documentation Tooltip */}
                {hoverDoc && (
                    <div
                        className="doc-tooltip"
                        style={{
                            top: hoverDoc.y,
                            left: hoverDoc.x,
                            transform: hoverDoc.align === 'right' ? 'translateX(-100%)' : 'none',
                            width: hoverDoc.customNode ? '320px' : 'auto',
                            maxWidth: '400px',
                            zIndex: 10000
                        }}
                    >
                        {hoverDoc.customNode ? (
                            <div className="custom-node-preview">
                                <div className="preview-header">{hoverDoc.customNode.label}</div>
                                <div className="preview-desc">{hoverDoc.text}</div>
                                {(() => {
                                    const internalNodes = (hoverDoc.customNode.internalNodes || []).filter(n => !n.disabled);
                                    if (internalNodes.length === 0) return <div className="preview-canvas" style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Empty Node</div>;

                                    // Calculate bounds
                                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

                                    internalNodes.forEach(n => {
                                        const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(n.type);
                                        const w = ['input', 'output'].includes(n.type) ? 120 : (isCompact ? 150 : 200);
                                        const h = 50;

                                        minX = Math.min(minX, n.x);
                                        maxX = Math.max(maxX, n.x + w);
                                        minY = Math.min(minY, n.y);
                                        maxY = Math.max(maxY, n.y + h);
                                    });

                                    const contentW = maxX - minX;
                                    const contentH = maxY - minY;

                                    // Add some padding
                                    const padding = 40;
                                    const MAX_W = 300;
                                    const MAX_H = 300;

                                    // Calculate scale to fit within MAX dimensions
                                    let scale = Math.min((MAX_W - padding) / contentW, (MAX_H - padding) / contentH);

                                    // Cap scale to prevent tiny graphs from being huge
                                    if (scale > 0.6) scale = 0.6;

                                    const displayW = contentW * scale + padding;
                                    const displayH = contentH * scale + padding;

                                    return (
                                        <div className="preview-canvas" style={{ width: displayW, height: displayH }}>
                                            <div style={{ transform: `scale(${scale}) translate(${-minX + padding / 2 / scale}px, ${-minY + padding / 2 / scale}px)`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
                                                {/* Connections */}
                                                <svg style={{ position: 'absolute', overflow: 'visible', top: 0, left: 0, width: 1, height: 1, zIndex: 0 }}>
                                                    {(hoverDoc.customNode.internalConnections || []).map(conn => {
                                                        const fromNode = internalNodes.find(n => n.id === conn.from);
                                                        const toNode = internalNodes.find(n => n.id === conn.to);
                                                        if (!fromNode || !toNode) return null;

                                                        const isCompactFrom = ['onStart', 'onClick', 'not', 'or'].includes(fromNode.type);
                                                        const widthFrom = ['input', 'output'].includes(fromNode.type) ? 120 : (isCompactFrom ? 150 : 200);

                                                        // Simple port calculation (Center-ish)
                                                        let y1Offset = 40;
                                                        let y2Offset = 40;

                                                        // Adjust for OR node inputs
                                                        if (toNode.type === 'or') {
                                                            if (conn.targetHandle === 'B') y2Offset = 60;
                                                            else y2Offset = 35;
                                                        }

                                                        const x1 = fromNode.x + widthFrom;
                                                        const y1 = fromNode.y + y1Offset;
                                                        const x2 = toNode.x;
                                                        const y2 = toNode.y + y2Offset;

                                                        return (
                                                            <path
                                                                key={conn.id}
                                                                d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                                                                stroke={conn.color || '#555'}
                                                                strokeWidth="4"
                                                                fill="none"
                                                            />
                                                        );
                                                    })}
                                                </svg>

                                                {/* Nodes */}
                                                {internalNodes.map(node => {
                                                    const isCompact = ['onStart', 'onClick', 'not', 'or'].includes(node.type);
                                                    const width = ['input', 'output'].includes(node.type) ? 120 : (isCompact ? 150 : 200);

                                                    return (
                                                        <div
                                                            key={node.id}
                                                            className={`node ${node.type} ${node.disabled ? 'disabled' : ''}`}
                                                            style={{
                                                                position: 'absolute',
                                                                left: node.x,
                                                                top: node.y,
                                                                width: width,
                                                                zIndex: 1,
                                                                transform: 'none'
                                                            }}
                                                        >
                                                            {/* Header */}
                                                            {(node.type !== 'input' && node.type !== 'output') && (
                                                                <div className="node-header">
                                                                    {node.customName || node.label}
                                                                    {node.customName && <div className="node-sublabel">{node.label}</div>}
                                                                </div>
                                                            )}
                                                            {(node.type === 'input' || node.type === 'output') && (
                                                                <div className="node-header">
                                                                    {node.customName || node.label || (node.type === 'input' ? 'Input' : 'Output')}
                                                                </div>
                                                            )}

                                                            {/* Body */}
                                                            <div className="node-body">
                                                                <div className="node-ports-row">
                                                                    {/* Inputs */}
                                                                    <div className="node-io-section inputs">
                                                                        {node.type === 'or' ? (
                                                                            <>
                                                                                <div className="io-port-wrapper">
                                                                                    <div className="node-port input"></div>
                                                                                    <span className="io-label">A</span>
                                                                                </div>
                                                                                <div className="io-port-wrapper">
                                                                                    <div className="node-port input"></div>
                                                                                    <span className="io-label">B</span>
                                                                                </div>
                                                                            </>
                                                                        ) : (node.type !== 'onStart' && node.type !== 'onClick' && node.type !== 'input') && (
                                                                            <div className="io-port-wrapper">
                                                                                <div className="node-port input"></div>
                                                                                <span className="io-label">In</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Outputs */}
                                                                    <div className="node-io-section outputs">
                                                                        {node.type !== 'output' && (
                                                                            <div className="io-port-wrapper right">
                                                                                <span className="io-label">Out</span>
                                                                                <div className="node-port output"></div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : hoverDoc.debugInfo ? (
                            <div className="debug-info-tooltip">
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#a78bfa', borderBottom: '1px solid #444', paddingBottom: '6px' }}>
                                    🔍 Node Debug Info
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#888' }}>ID:</span>
                                        <span style={{ color: '#4ade80', userSelect: 'text' }}>{hoverDoc.debugInfo.id}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#888' }}>Type:</span>
                                        <span style={{ color: '#60a5fa' }}>{hoverDoc.debugInfo.type}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#888' }}>Label:</span>
                                        <span style={{ color: '#fbbf24' }}>{hoverDoc.debugInfo.customName || hoverDoc.debugInfo.label}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#888' }}>Position:</span>
                                        <span style={{ color: '#c4b5fd' }}>({hoverDoc.debugInfo.position.x}, {hoverDoc.debugInfo.position.y})</span>
                                    </div>
                                    {hoverDoc.debugInfo.disabled && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: '#888' }}>Status:</span>
                                            <span style={{ color: '#f87171' }}>⚠️ Disabled</span>
                                        </div>
                                    )}
                                    {hoverDoc.debugInfo.locked && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: '#888' }}>Status:</span>
                                            <span style={{ color: '#fbbf24' }}>🔒 Locked</span>
                                        </div>
                                    )}
                                    {/* Function Block specific info */}
                                    {hoverDoc.debugInfo.language && (
                                        <>
                                            <div style={{ borderTop: '1px solid #444', marginTop: '6px', paddingTop: '6px' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Language:</span>
                                                <span style={{ color: '#34d399' }}>{hoverDoc.debugInfo.language}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Sync:</span>
                                                <span style={{ color: hoverDoc.debugInfo.synchronize ? '#4ade80' : '#f97316' }}>
                                                    {hoverDoc.debugInfo.synchronize ? '✓ Yes' : '✗ Async'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Code:</span>
                                                <span style={{ color: '#94a3b8' }}>{hoverDoc.debugInfo.codeLength} chars</span>
                                            </div>
                                        </>
                                    )}
                                    {/* Sleep Node specific info */}
                                    {hoverDoc.debugInfo.sleepTime !== undefined && (
                                        <>
                                            <div style={{ borderTop: '1px solid #444', marginTop: '6px', paddingTop: '6px' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Duration:</span>
                                                <span style={{ color: '#f472b6' }}>{hoverDoc.debugInfo.sleepTime}ms</span>
                                            </div>
                                        </>
                                    )}
                                    {/* Custom Node specific info */}
                                    {hoverDoc.debugInfo.templateId && (
                                        <>
                                            <div style={{ borderTop: '1px solid #444', marginTop: '6px', paddingTop: '6px' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Template:</span>
                                                <span style={{ color: '#c4b5fd', fontSize: '10px', wordBreak: 'break-all' }}>{hoverDoc.debugInfo.templateId}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Internal:</span>
                                                <span style={{ color: '#94a3b8' }}>
                                                    {hoverDoc.debugInfo.internalNodesCount} nodes, {hoverDoc.debugInfo.internalConnectionsCount} conns
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {hoverDoc.text && (
                                    <div style={{ borderTop: '1px solid #444', marginTop: '8px', paddingTop: '8px', color: '#94a3b8', fontSize: '12px' }}>
                                        {hoverDoc.text}
                                    </div>
                                )}
                            </div>
                        ) : (
                            hoverDoc.text
                        )}
                    </div>
                )}

                {/* Save Notification */}
                {saveNotification?.show && (
                    <div className="save-notification">
                        <img src={saveIcon} alt="" style={{ width: '20px', height: '20px' }} />
                        <span>{saveNotification.name} Saved</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Editor;