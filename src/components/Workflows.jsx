import React, { useState, useEffect } from 'react';

import notFoundIcon from '../assets/not_found.svg';
import diceIcon from '../assets/icons/dice.svg';
import disableIcon from '../assets/icons/disable.svg';
import instancesIcon from '../assets/icons/instances.svg';
import customNodesIcon from '../assets/icons/custom-nodes.svg';
import questionIcon from '../assets/icons/question.svg';

function Workflows({ workflows, recentTemplates, onCreate, onSelectTemplate, onOpen, onRename, onEdit, onToggleStatus, onRestart, onDelete, onOpenCustomNode, currentEngine, onRefresh }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [shakingId, setShakingId] = useState(null);
    const [activeTab, setActiveTab] = useState('instances'); // 'instances' or 'custom-nodes'
    const [customNodes, setCustomNodes] = useState([]);
    const [nodeLatencies, setNodeLatencies] = useState({}); // { nodeId: { latency: number, calculating: boolean } }
    const [activeCustomNodeMenuId, setActiveCustomNodeMenuId] = useState(null);
    const [customNodeModalConfig, setCustomNodeModalConfig] = useState({
        isOpen: false,
        mode: 'edit',
        nodeId: null,
        name: '',
        description: '',
        category: 'Logical',
        error: ''
    });

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        mode: 'create', // 'create' | 'edit'
        id: null,
        name: '',
        idleTimeout: 15000,
        error: ''
    });

    useEffect(() => {
        fetchCustomNodes();
    }, []);

    // Poll for runtime updates of online workflows or workflows with active runtime state (like Stopping)
    useEffect(() => {
        const shouldPoll = workflows?.some(w => w.status === 'Online' || w.runtime);
        if (!shouldPoll) return;

        const interval = setInterval(() => {
            if (onRefresh) onRefresh();
        }, 1000); // Refresh every 1 second

        return () => clearInterval(interval);
    }, [workflows, onRefresh]);

    const fetchCustomNodes = () => {
        // Fetch custom nodes from server
        fetch('http://server:3001/api/nodes')
            .then(res => res.json())
            .then(data => {
                setCustomNodes(data);
                // Calculate latency for nodes that don't have it yet
                data.forEach(node => {
                    if (!nodeLatencies[node.id]) {
                        calculateLatency(node);
                    }
                });
            })
            .catch(err => console.error('Failed to fetch custom nodes:', err));
    };

    const calculateLatency = (node) => {
        // Mark as calculating
        setNodeLatencies(prev => ({
            ...prev,
            [node.id]: { latency: null, calculating: true }
        }));

        // Start timer
        const startTime = performance.now();
        const timeout = 5000; // 5 seconds

        // Simulate execution from input to output
        const simulateExecution = () => {
            return new Promise((resolve) => {
                const internalNodes = node.internalNodes || [];
                const connections = node.internalConnections || [];

                // Find input nodes
                const inputNodes = internalNodes.filter(n => n.type === 'input');
                if (inputNodes.length === 0) {
                    resolve(0);
                    return;
                }

                // Simple traversal simulation - count nodes and connections
                let totalDelay = 0;

                // Each node adds ~1ms base latency
                totalDelay += internalNodes.length * 1;

                // Each connection adds ~0.5ms
                totalDelay += connections.length * 0.5;

                // Function blocks add more delay
                const functionBlocks = internalNodes.filter(n => n.type === 'functionBlock');
                totalDelay += functionBlocks.length * 2;

                // Wait nodes add their configured delay
                const sleepNodes = internalNodes.filter(n => n.type === 'wait');
                sleepNodes.forEach(n => {
                    totalDelay += (n.sleepTime || 1000);
                });

                // Custom nodes (nested) add estimated delay
                const customNodes = internalNodes.filter(n => n.type === 'custom');
                totalDelay += customNodes.length * 10;

                resolve(totalDelay);
            });
        };

        simulateExecution().then(latency => {
            const elapsed = performance.now() - startTime;
            const finalLatency = Math.max(latency, elapsed);

            if (finalLatency >= timeout) {
                setNodeLatencies(prev => ({
                    ...prev,
                    [node.id]: { latency: null, calculating: false, overLimit: true }
                }));
            } else {
                setNodeLatencies(prev => ({
                    ...prev,
                    [node.id]: { latency: Math.round(finalLatency), calculating: false }
                }));
            }
        }).catch(err => {
            console.error('Failed to calculate latency:', err);
            setNodeLatencies(prev => ({
                ...prev,
                [node.id]: { latency: null, calculating: false, error: true }
            }));
        });
    };

    const toggleDropdown = () => setShowDropdown(!showDropdown);

    const generateRandomName = () => {
        const adjectives = ['Swift', 'Silent', 'Bold', 'Brave', 'Calm', 'Cool', 'Dark', 'Deep', 'Fast', 'Good', 'Hard', 'Hot', 'Kind', 'Loud', 'Mild', 'Nice', 'Pure', 'Rich', 'Safe', 'Soft', 'Warm', 'Wild', 'Wise'];
        const nouns = ['River', 'Ocean', 'Mountain', 'Forest', 'Sky', 'Star', 'Moon', 'Sun', 'Wind', 'Rain', 'Fire', 'Ice', 'Snow', 'Storm', 'Cloud', 'Bird', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Hawk', 'Eagle'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 100);
        return `${randomAdjective}${randomNoun}${randomNumber}`;
    };

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const handleSelectTemplate = (template) => {
        onSelectTemplate(template);
        setShowDropdown(false);
    };

    const openCreateModal = () => {
        setModalConfig({
            isOpen: true,
            mode: 'create',
            id: null,
            name: '',
            idleTimeout: 15000,
            error: ''
        });
        setShowDropdown(false);
    };

    const openEditModal = (e, id) => {
        e.stopPropagation();
        const workflow = workflows.find(w => w.id === id);
        if (workflow) {
            setModalConfig({
                isOpen: true,
                mode: 'edit',
                id: id,
                name: workflow.name,
                idleTimeout: workflow.idleTimeout !== undefined ? workflow.idleTimeout : 15000,
                error: ''
            });
        }
        setActiveMenuId(null);
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const validateName = (name) => {
        if (name.length > 24) return "Name cannot be more than 24 characters.";
        if (/^[0-9!@#$%^&*(),.?":{}|<>]/.test(name)) return "Name cannot start with a number or special character.";
        return "";
    };

    const handleModalSubmit = () => {
        const { mode, id, name, idleTimeout } = modalConfig;

        const error = validateName(name);
        if (error) {
            setModalConfig(prev => ({ ...prev, error }));
            return;
        }
        if (!name.trim()) {
            setModalConfig(prev => ({ ...prev, error: "Name is required." }));
            return;
        }

        let idle = parseInt(idleTimeout);
        if (isNaN(idle) || idle < 0) idle = 0;

        const workflowData = {
            name,
            idleTimeout: idle
        };

        if (mode === 'create') {
            onCreate(workflowData);
        } else {
            onEdit(id, workflowData);
        }
        closeModal();
    };

    const handleStatus = (e, id) => {
        e.stopPropagation();
        onToggleStatus(id);
        setActiveMenuId(null);
    };

    const handleRestart = (e, id) => {
        e.stopPropagation();
        onRestart(id);
        setActiveMenuId(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this workflow?")) {
            onDelete(id);
        }
        setActiveMenuId(null);
    };

    const toggleCustomNodeMenu = (e, id) => {
        e.stopPropagation();
        setActiveCustomNodeMenuId(activeCustomNodeMenuId === id ? null : id);
    };

    const openEditCustomNodeModal = (e, node) => {
        e.stopPropagation();
        setCustomNodeModalConfig({
            isOpen: true,
            mode: 'edit',
            nodeId: node.id,
            name: node.name,
            description: node.description || '',
            category: node.category || 'Logical',
            error: ''
        });
        setActiveCustomNodeMenuId(null);
    };

    const closeCustomNodeModal = () => {
        setCustomNodeModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleCustomNodeModalSubmit = async () => {
        const { nodeId, name, description, category } = customNodeModalConfig;

        const error = validateName(name);
        if (error) {
            setCustomNodeModalConfig(prev => ({ ...prev, error }));
            return;
        }
        if (!name.trim()) {
            setCustomNodeModalConfig(prev => ({ ...prev, error: "Name is required." }));
            return;
        }

        try {
            const node = customNodes.find(n => n.id === nodeId);
            const updatedNode = { ...node, name, description, category };

            await fetch(`http://server:3001/api/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedNode)
            });

            fetchCustomNodes();
            closeCustomNodeModal();
            // Recalculate latency for the updated node
            setTimeout(() => {
                const updatedNode = customNodes.find(n => n.id === nodeId);
                if (updatedNode) {
                    calculateLatency(updatedNode);
                }
            }, 100);
        } catch (err) {
            console.error('Failed to update custom node:', err);
            setCustomNodeModalConfig(prev => ({ ...prev, error: 'Failed to save changes.' }));
        }
    };

    const handleDuplicateCustomNode = async (e, node) => {
        e.stopPropagation();
        setActiveCustomNodeMenuId(null);

        try {
            // Find existing nodes with similar names
            const baseNameMatch = node.name.match(/^(.+?)\s*(\d*)$/);
            const baseName = baseNameMatch ? baseNameMatch[1] : node.name;
            const existingNumbers = customNodes
                .filter(n => n.name.startsWith(baseName))
                .map(n => {
                    const match = n.name.match(/^.+?\s*(\d+)$/);
                    return match ? parseInt(match[1]) : 1;
                });
            const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2;

            const newNode = {
                ...node,
                id: `custom-${Date.now()}`,
                name: `${baseName} ${nextNumber}`
            };

            await fetch('http://server:3001/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newNode)
            });

            fetchCustomNodes();
        } catch (err) {
            console.error('Failed to duplicate custom node:', err);
        }
    };

    const handleDeleteCustomNode = async (e, nodeId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this custom node?")) {
            return;
        }
        setActiveCustomNodeMenuId(null);

        try {
            await fetch(`http://server:3001/api/nodes/${nodeId}`, {
                method: 'DELETE'
            });
            fetchCustomNodes();
        } catch (err) {
            console.error('Failed to delete custom node:', err);
        }
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenuId(null);
            setActiveCustomNodeMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="workflows-page">
            <header style={{ padding: "20px 20px 0 20px" }}>
                <h1>Workflows</h1>
            </header>

            {/* Tabs */}
            <div className="tabs-container">
                <div className="tabs">
                    <div
                        className={`tab ${activeTab === 'instances' ? 'active' : ''}`}
                        onClick={() => setActiveTab('instances')}
                    >
                        <img src={instancesIcon} alt="" className="tab-icon" />
                        <span className="tab-title">Instances</span>
                    </div>
                    <div
                        className={`tab ${activeTab === 'custom-nodes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('custom-nodes')}
                    >
                        <img src={customNodesIcon} alt="" className="tab-icon" />
                        <span className="tab-title">Custom Nodes</span>
                    </div>
                    <div className="tab-spacer"></div>
                </div>
            </div>

            <div className="workflows-content">{activeTab === 'instances' ? (
                <>
                    {workflows.length === 0 ? (
                        <div className="empty-state">
                            <img src={notFoundIcon} alt="No workflows found" className="empty-icon" />
                            <h2>No Workflows Found</h2>
                            <p>Get started by creating a new workflow.</p>

                            <div className="create-workflow-container">
                                <div className="button-group">
                                    <button className="btn-primary" onClick={openCreateModal}>
                                        Make new instance workflows
                                    </button>
                                    <button className="btn-primary btn-arrow" onClick={toggleDropdown}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                </div>

                                {showDropdown && (
                                    <div className="dropdown-menu">
                                        {recentTemplates.length > 0 && (
                                            <>
                                                <div className="dropdown-header">Recent Templates</div>
                                                {recentTemplates.map((template, index) => (
                                                    <div
                                                        key={index}
                                                        className="dropdown-item"
                                                        onClick={() => handleSelectTemplate(template)}
                                                    >
                                                        {template.name}
                                                    </div>
                                                ))}
                                                <div className="dropdown-divider"></div>
                                            </>
                                        )}

                                        <div className="dropdown-item" onClick={openCreateModal}>
                                            Create from scratch
                                        </div>
                                        <div
                                            className="dropdown-item"
                                            onClick={() => handleSelectTemplate({ name: 'Basic Template', id: 'basic' })}
                                        >
                                            Create from template
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="workflows-grid">
                            <div className="workflow-card create-card" onClick={openCreateModal}>
                                <div className="create-icon">+</div>
                                <h3>Create New</h3>
                            </div>
                            {workflows.map(workflow => {
                                const isLocked = workflow.engine && workflow.engine !== currentEngine;
                                const isShaking = shakingId === workflow.id;

                                return (
                                    <div
                                        key={workflow.id}
                                        className={`workflow-card ${isLocked ? 'locked' : ''} ${isShaking ? 'shake' : ''}`}
                                        onClick={() => {
                                            if (isLocked) {
                                                setShakingId(workflow.id);
                                                setTimeout(() => setShakingId(null), 500);
                                            } else {
                                                onOpen(workflow);
                                            }
                                        }}
                                        style={isLocked ? { opacity: 0.6, cursor: 'not-allowed', position: 'relative' } : {}}
                                    >
                                        {isLocked && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10,
                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                borderRadius: '8px'
                                            }}>
                                                <img src={disableIcon} alt="Locked" style={{ width: '32px', height: '32px' }} title={`Locked: Created with ${workflow.engine} engine`} />
                                            </div>
                                        )}
                                        <div className="card-header">
                                            <div className={`status-indicator ${(workflow.runtime?.status || workflow.status || 'Offline').toLowerCase()}`}>
                                                {workflow.runtime?.status || workflow.status || 'Offline'}
                                            </div>
                                            <div className="card-menu-container">
                                                <button className="menu-dots" onClick={(e) => !isLocked && toggleMenu(e, workflow.id)} disabled={isLocked}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="1"></circle>
                                                        <circle cx="12" cy="5" r="1"></circle>
                                                        <circle cx="12" cy="19" r="1"></circle>
                                                    </svg>
                                                </button>
                                                {activeMenuId === workflow.id && (
                                                    <div className="card-menu-dropdown">
                                                        <div className="menu-item" onClick={(e) => openEditModal(e, workflow.id)}>Edit Instance</div>
                                                        <div className="menu-item" onClick={(e) => handleStatus(e, workflow.id)}>
                                                            {(workflow.status === 'Online' || workflow.status === 'Idling') ? 'Stop' : 'Start'}
                                                        </div>
                                                        {(workflow.status === 'Online' || workflow.status === 'Idling') && (
                                                            <div className="menu-item" onClick={(e) => handleRestart(e, workflow.id)}>Restart</div>
                                                        )}
                                                        <div className="menu-item delete" onClick={(e) => handleDelete(e, workflow.id)}>Delete</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <h3>{workflow.name}</h3>
                                            {workflow.engine && <p className="workflow-engine" style={{ fontSize: '0.8rem', color: '#888' }}>Engine: {workflow.engine}</p>}
                                            <p className="workflow-id">ID: {workflow.id}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}</>
            ) : (
                <>
                    {customNodes.length === 0 ? (
                        <div className="empty-state">
                            <img src={notFoundIcon} alt="No custom nodes found" className="empty-icon" />
                            <h2>No Custom Nodes</h2>
                            <p>Create custom nodes from the editor.</p>
                        </div>
                    ) : (
                        <div className="custom-nodes-tab">
                            <div className="custom-nodes-grid">
                                {customNodes.map(node => (
                                    <div key={node.id} className="custom-node-card" onClick={() => onOpenCustomNode && onOpenCustomNode(node)}>
                                        <div className="custom-node-menu-container">
                                            <button className="custom-node-menu-dots" onClick={(e) => toggleCustomNodeMenu(e, node.id)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="1"></circle>
                                                    <circle cx="12" cy="5" r="1"></circle>
                                                    <circle cx="12" cy="19" r="1"></circle>
                                                </svg>
                                            </button>
                                            {activeCustomNodeMenuId === node.id && (
                                                <div className="custom-node-menu-dropdown">
                                                    <div className="menu-item" onClick={(e) => openEditCustomNodeModal(e, node)}>Edit Node</div>
                                                    <div className="menu-item" onClick={(e) => handleDuplicateCustomNode(e, node)}>Duplicate</div>
                                                    <div className="menu-item delete" onClick={(e) => handleDeleteCustomNode(e, node.id)}>Delete</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="custom-node-preview">
                                            <div className="node-shape">
                                                <div className="node-shape-header">
                                                    <h3>{node.name}</h3>
                                                </div>
                                                <div className="node-shape-body">
                                                    <div className="node-io-visual">
                                                        <div className="node-inputs">
                                                            {node.inputs?.map((input, idx) => (
                                                                <div key={idx} className="node-io-item">
                                                                    <div className="node-port input-port"></div>
                                                                    <span className="io-label-text">{input.label || input.customName || 'Input'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="node-outputs">
                                                            {node.outputs?.map((output, idx) => (
                                                                <div key={idx} className="node-io-item">
                                                                    <span className="io-label-text">{output.label || output.customName || 'Output'}</span>
                                                                    <div className="node-port output-port"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="custom-node-details">
                                            <div className="detail-row">
                                                <span className="detail-label">Category:</span>
                                                <span className="detail-value">{node.category || 'Custom'}</span>
                                            </div>
                                            <div className="custom-node-stats">
                                                <span>Internal Nodes: {node.internalNodes?.length || 0}</span>
                                                <span>Connections: {node.internalConnections?.length || 0}</span>
                                                <span>
                                                    Latency: {nodeLatencies[node.id]?.calculating ? (
                                                        'Calculating...'
                                                    ) : nodeLatencies[node.id]?.overLimit ? (
                                                        '>5s'
                                                    ) : nodeLatencies[node.id]?.error ? (
                                                        'Error'
                                                    ) : nodeLatencies[node.id]?.latency != null ? (
                                                        `~${nodeLatencies[node.id].latency}ms`
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}                </div>
            {modalConfig.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modalConfig.mode === 'create' ? 'Create New Instance' : 'Edit Instance'}</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <h4>Name of Instance</h4>
                                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={modalConfig.name}
                                        onChange={(e) => setModalConfig({ ...modalConfig, name: e.target.value })}
                                        placeholder="Enter instance name"
                                        maxLength={24}
                                        style={{ paddingRight: '40px', width: '100%' }}
                                    />
                                    <img
                                        src={diceIcon}
                                        alt="Random Name"
                                        onClick={() => setModalConfig({ ...modalConfig, name: generateRandomName() })}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            cursor: 'pointer',
                                            width: '20px',
                                            height: '20px',
                                            opacity: 0.7,
                                            transition: 'opacity 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.opacity = 1}
                                        onMouseOut={(e) => e.target.style.opacity = 0.7}
                                        title="Generate Random Name"
                                    />
                                </div>
                                {modalConfig.error && <div className="error-message" style={{ color: 'red', fontSize: '0.8rem', marginTop: '5px' }}>{modalConfig.error}</div>}
                            </div>
                            <br />

                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                    <label style={{ margin: 0 }}>Idling Time (ms)</label>
                                    <div className="tooltip-container">
                                        <img src={questionIcon} alt="Info" style={{ width: '14px', height: '14px', cursor: 'help', opacity: 0.7 }} />
                                        <span className="tooltip-text">Time before workflow enters idling state to reduce load. 0 to disable. Default: 15000ms.</span>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    value={modalConfig.idleTimeout}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setModalConfig({ ...modalConfig, idleTimeout: '' });
                                        else {
                                            const num = parseInt(val);
                                            if (!isNaN(num) && num >= 0) setModalConfig({ ...modalConfig, idleTimeout: num });
                                        }
                                    }}
                                    min="0"
                                    placeholder="15000"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={closeModal}>Cancel</button>
                            <button className="primary" onClick={handleModalSubmit}>
                                {modalConfig.mode === 'create' ? 'Create' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {customNodeModalConfig.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Custom Node</h2>
                            <button className="modal-close" onClick={closeCustomNodeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <h4>Node Name</h4>
                                <input
                                    type="text"
                                    value={customNodeModalConfig.name}
                                    onChange={(e) => setCustomNodeModalConfig({ ...customNodeModalConfig, name: e.target.value })}
                                    placeholder="Enter node name"
                                    maxLength={24}
                                />
                                {customNodeModalConfig.error && <div className="error-message" style={{ color: 'red', fontSize: '0.8rem', marginTop: '5px' }}>{customNodeModalConfig.error}</div>}
                            </div>
                            <div className="form-group">
                                <h4>Description</h4>
                                <textarea
                                    value={customNodeModalConfig.description}
                                    onChange={(e) => setCustomNodeModalConfig({ ...customNodeModalConfig, description: e.target.value })}
                                    placeholder="Enter description (optional)"
                                    rows={3}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                                />
                            </div>
                            <div className="form-group">
                                <h4>Category</h4>
                                <select
                                    value={customNodeModalConfig.category}
                                    onChange={(e) => setCustomNodeModalConfig({ ...customNodeModalConfig, category: e.target.value })}
                                    className="category-select"
                                >
                                    <option value="Utility">Utility</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Logical">Logical</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={closeCustomNodeModal}>Cancel</button>
                            <button className="primary" onClick={handleCustomNodeModalSubmit}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Workflows;
