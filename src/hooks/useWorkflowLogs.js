import { useEffect, useRef, useCallback } from 'react';

// WebSocket connection for workflow console logs
// Displays logs from Function Block execution in browser developer console

// Global singleton to prevent multiple connections
let globalWs = null;
let globalConnecting = false;
let globalConnected = false;

export function useWorkflowLogs(enabled = true) {
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (!enabled) return;

        // Prevent duplicate connections
        if (globalConnected || globalConnecting) return;
        if (globalWs && globalWs.readyState === WebSocket.OPEN) return;

        globalConnecting = true;

        // Determine WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = 3001; // Server port
        const wsUrl = `${protocol}//${host}:${port}/ws/logs`;

        try {
            // Close existing connection if any
            if (globalWs) {
                globalWs.close();
            }

            const ws = new WebSocket(wsUrl);
            globalWs = ws;

            ws.onopen = () => {
                globalConnecting = false;
                globalConnected = true;
                console.log('%c[FlowForge] Connected to workflow logs', 'color: #b091f8ff;');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'console') {
                        const { level, nodeId, workflowId, workflowName, message, unsaved } = data;

                        // Format: [nodeId@workflow-workflowId] or (UNSAVED) [nodeId@workflowName] 
                        const prefix = unsaved
                            ? `%c(UNSAVED) [${nodeId}@${workflowName || workflowId}]%c`
                            : `%c[${nodeId}@workflow-${workflowId}]%c`;

                        // Style based on log level
                        const styles = {
                            log: ['color: #8b5cf6; font-weight: bold;', 'color: inherit;'],
                            info: ['color: #3b82f6; font-weight: bold;', 'color: #3b82f6;'],
                            warn: ['color: #f59e0b; font-weight: bold;', 'color: #f59e0b;'],
                            error: ['color: #ef4444; font-weight: bold;', 'color: #ef4444;'],
                            debug: ['color: #6b7280; font-weight: bold;', 'color: #6b7280;'],
                        };

                        const [prefixStyle, messageStyle] = styles[level] || styles.log;

                        // Use appropriate console method
                        switch (level) {
                            case 'error':
                                console.error(prefix, prefixStyle, messageStyle, message);
                                break;
                            case 'warn':
                                console.warn(prefix, prefixStyle, messageStyle, message);
                                break;
                            case 'info':
                                console.info(prefix, prefixStyle, messageStyle, message);
                                break;
                            case 'debug':
                                console.debug(prefix, prefixStyle, messageStyle, message);
                                break;
                            default:
                                console.log(prefix, prefixStyle, messageStyle, message);
                        }
                    }
                } catch (err) {
                    // Ignore parse errors
                }
            };

            ws.onclose = () => {
                globalConnecting = false;
                globalConnected = false;
                globalWs = null;
                // Attempt to reconnect after 1 second (faster reconnect)
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (enabled) {
                        connect();
                    }
                }, 1000);
            };

            ws.onerror = () => {
                globalConnecting = false;
                globalConnected = false;
                // Silent error - will attempt reconnect on close
            };
        } catch (err) {
            globalConnecting = false;
            globalConnected = false;
            // Connection failed, will retry
        }
    }, [enabled]);

    useEffect(() => {
        // Connect immediately
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            // Don't close global connection on unmount - keep it alive
        };
    }, [connect]);

    return null;
}

export default useWorkflowLogs;
