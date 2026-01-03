import { useState, useEffect, useCallback, useRef } from 'react';
import { workflowsAPI } from '../utils/api';

export function useWorkflows(systemSettings) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const transitioningIds = useRef(new Set());

    const fetchWorkflows = useCallback(async (useCache = true) => {
        try {
            setLoading(true);
            setError(null);
            const data = await workflowsAPI.getAll(useCache);
            // Ensure all workflows have required fields
            const normalizedData = data.map(w => ({
                ...w,
                status: w.status || 'Offline',
                engine: w.engine || 'json'
            }));

            setWorkflows(prev => {
                return normalizedData.map(w => {
                    // If this workflow is currently transitioning locally, preserve its local status
                    if (transitioningIds.current.has(w.id)) {
                        const currentLocal = prev.find(p => p.id === w.id);
                        if (currentLocal) {
                            return {
                                ...w,
                                status: currentLocal.status,
                                // Also override runtime status if it exists, to ensure UI reflects local state
                                runtime: w.runtime ? { ...w.runtime, status: currentLocal.status } : (currentLocal.runtime || undefined)
                            };
                        }
                    }
                    return w;
                });
            });
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch workflows:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createWorkflow = useCallback(async (workflow) => {
        try {
            const newWorkflow = await workflowsAPI.create(workflow);
            setWorkflows(prev => [...prev, newWorkflow]);
            return newWorkflow;
        } catch (err) {
            console.error('Failed to create workflow:', err);
            throw err;
        }
    }, []);

    const updateWorkflow = useCallback(async (id, updates) => {
        try {
            const updated = await workflowsAPI.update(id, updates);
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, ...updated } : w));
            return updated;
        } catch (err) {
            console.error('Failed to update workflow:', err);
            throw err;
        }
    }, []);

    const deleteWorkflow = useCallback(async (id) => {
        try {
            await workflowsAPI.delete(id);
            setWorkflows(prev => prev.filter(w => w.id !== id));
        } catch (err) {
            console.error('Failed to delete workflow:', err);
            throw err;
        }
    }, []);

    const toggleStatus = useCallback(async (id) => {
        try {
            // Get current workflow and new status
            let currentWorkflow;
            setWorkflows(prev => {
                currentWorkflow = prev.find(w => w.id === id);
                return prev;
            });

            // If not found locally (stale list), refresh from backend once
            if (!currentWorkflow) {
                try {
                    const all = await workflowsAPI.getAll(false);
                    currentWorkflow = all.find(w => w.id === id);
                    // Update local cache with fresh data
                    if (all && all.length) {
                        const normalizedData = all.map(w => ({ ...w, status: w.status || 'Offline', engine: w.engine || 'json' }));
                        setWorkflows(normalizedData);
                    }
                } catch (err) {
                    console.error('Failed to refresh workflows before toggling status:', err);
                }
            }

            if (!currentWorkflow) return;

            // Both 'Online' and 'Idling' are running states that should be stopped
            const isRunning = currentWorkflow.status === 'Online' || currentWorkflow.status === 'Idling';
            const targetStatus = isRunning ? 'Offline' : 'Online';
            const intermediateStatus = isRunning ? 'Stopping' : 'Preparing';

            // Mark as transitioning to prevent polling from overwriting status
            transitioningIds.current.add(id);

            // Optimistically update UI to intermediate state immediately
            setWorkflows(prev => prev.map(w =>
                w.id === id ? {
                    ...w,
                    status: intermediateStatus,
                    // Ensure runtime status matches if it exists, so UI displays it correctly
                    runtime: w.runtime ? { ...w.runtime, status: intermediateStatus } : undefined
                } : w
            ));

            // Simulate delay for visual feedback (2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Then update backend
            await updateWorkflow(id, { status: targetStatus });

            // Update UI to final state and clean up runtime if going offline
            setWorkflows(prev => prev.map(w =>
                w.id === id ? {
                    ...w,
                    status: targetStatus,
                    runtime: targetStatus === 'Offline' ? undefined : (w.runtime ? { ...w.runtime, status: targetStatus } : undefined)
                } : w
            ));
        } catch (err) {
            console.error('Failed to toggle workflow status:', err);
            // Revert on error
            setWorkflows(prev => prev.map(w =>
                w.id === id ? { ...w, status: w.status === 'Online' ? 'Offline' : 'Online' } : w
            ));
            throw err;
        } finally {
            // Clear transitioning flag
            transitioningIds.current.delete(id);
        }
    }, [updateWorkflow]);

    const restartWorkflow = useCallback(async (id) => {
        try {
            // Get current workflow
            let currentWorkflow;
            setWorkflows(prev => {
                currentWorkflow = prev.find(w => w.id === id);
                return prev;
            });

            // If not found locally (stale list), refresh from backend once
            if (!currentWorkflow) {
                try {
                    const all = await workflowsAPI.getAll(false);
                    currentWorkflow = all.find(w => w.id === id);
                    // Update local cache with fresh data
                    if (all && all.length) {
                        const normalizedData = all.map(w => ({ ...w, status: w.status || 'Offline', engine: w.engine || 'json' }));
                        setWorkflows(normalizedData);
                    }
                } catch (err) {
                    console.error('Failed to refresh workflows before restarting:', err);
                }
            }

            if (!currentWorkflow) return;

            // Only restart if currently running
            const isRunning = currentWorkflow.status === 'Online' || currentWorkflow.status === 'Idling';
            if (!isRunning) return;

            // Mark as transitioning
            transitioningIds.current.add(id);

            // Show Stopping state
            setWorkflows(prev => prev.map(w =>
                w.id === id ? {
                    ...w,
                    status: 'Stopping',
                    runtime: w.runtime ? { ...w.runtime, status: 'Stopping' } : undefined
                } : w
            ));

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Show Preparing state
            setWorkflows(prev => prev.map(w =>
                w.id === id ? {
                    ...w,
                    status: 'Preparing',
                    runtime: w.runtime ? { ...w.runtime, status: 'Preparing' } : undefined
                } : w
            ));

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Send restart request to backend (with _restart flag)
            await workflowsAPI.update(id, { status: 'Online', _restart: true });

            // Update UI to Online
            setWorkflows(prev => prev.map(w =>
                w.id === id ? {
                    ...w,
                    status: 'Online',
                    runtime: w.runtime ? { ...w.runtime, status: 'Online' } : undefined
                } : w
            ));
        } catch (err) {
            console.error('Failed to restart workflow:', err);
            throw err;
        } finally {
            transitioningIds.current.delete(id);
        }
    }, []);

    // Stop workflows when engine changes
    useEffect(() => {
        if (!systemSettings?.engine) return;

        const hasMismatch = workflows.some(
            w => w.status === 'Online' && w.engine && w.engine !== systemSettings.engine
        );

        if (hasMismatch) {
            workflows.forEach(async (w) => {
                if (w.status === 'Online' && w.engine && w.engine !== systemSettings.engine) {
                    try {
                        if (w.engine === 'json') {
                            await updateWorkflow(w.id, { status: 'Offline' });
                        } else {
                            setWorkflows(prev =>
                                prev.map(workflow =>
                                    workflow.id === w.id ? { ...workflow, status: 'Offline' } : workflow
                                )
                            );
                        }
                    } catch (err) {
                        console.error('Failed to stop workflow on engine switch:', err);
                    }
                }
            });
        }
    }, [systemSettings?.engine, workflows, updateWorkflow]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    return {
        workflows,
        loading,
        error,
        refresh: () => fetchWorkflows(false), // Always bypass cache when explicitly refreshing
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        toggleStatus,
        restartWorkflow,
        setWorkflows
    };
}
