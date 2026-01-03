import { useState, useEffect } from 'react'
import './assets/styles/App.css'
import './assets/styles/Editor.css'
import Workflows from './components/Workflows'
import Settings from './components/Settings'
import Editor from './components/Editor'
import { useSettings } from './hooks/useSettings'
import { useWorkflows } from './hooks/useWorkflows'
import { useWorkflowLogs } from './hooks/useWorkflowLogs'

function App() {
  const [page, setPage] = useState('dashboard')
  const [recentTemplates, setRecentTemplates] = useState([])
  const [currentWorkflow, setCurrentWorkflow] = useState(null)
  const [editingCustomNode, setEditingCustomNode] = useState(null)
  const [workflowsKey, setWorkflowsKey] = useState(0)

  // Use custom hooks for settings and workflows
  const { theme, keybinds, systemSettings, setTheme: handleSetTheme,
    setKeybinds: handleSetKeybinds, setSystemSettings: handleSetSystemSettings } = useSettings()

  const { workflows, createWorkflow, updateWorkflow, deleteWorkflow,
    toggleStatus, refresh, restartWorkflow } = useWorkflows(systemSettings)

  // Connect to workflow logs WebSocket - displays Function Block console output in browser dev tools
  useWorkflowLogs(true)

  const handleCreateWorkflow = async (workflowData) => {
    try {
      const newWorkflow = {
        id: Date.now(),
        name: workflowData?.name || `New Workflow ${workflows.length + 1}`,
        status: 'Offline',
        signalType: workflowData?.signalType || 'rapid',
        signalDelay: workflowData?.signalDelay || 0,
        idleTimeout: workflowData?.idleTimeout !== undefined ? workflowData.idleTimeout : 15000,
        engine: systemSettings.engine
      }

      await createWorkflow(newWorkflow)
      setCurrentWorkflow(newWorkflow)
      setPage('editor')
    } catch (err) {
      console.error('Failed to create workflow:', err)
    }
  }

  const handleSelectTemplate = async (template) => {
    try {
      const newRecents = [template, ...recentTemplates.filter(t => t.id !== template.id)].slice(0, 5)
      setRecentTemplates(newRecents)

      const newWorkflow = {
        id: Date.now(),
        name: `${template.name} Instance`,
        status: 'Offline',
        engine: systemSettings.engine
      }

      await createWorkflow(newWorkflow)
      setCurrentWorkflow(newWorkflow)
      setPage('editor')
    } catch (err) {
      console.error('Failed to create workflow from template:', err)
    }
  }

  const handleOpenWorkflow = (workflow) => {
    setCurrentWorkflow(workflow)
    setEditingCustomNode(null)
    setPage('editor')
  }

  const handleOpenCustomNode = (customNode) => {
    setEditingCustomNode(customNode)
    setCurrentWorkflow(null)
    setPage('editor')
  }

  const handleRenameWorkflow = async (id, newName) => {
    try {
      await updateWorkflow(id, { name: newName })
    } catch (err) {
      console.error('Failed to rename workflow:', err)
    }
  }

  const handleEditWorkflow = async (id, updates) => {
    try {
      await updateWorkflow(id, updates)
    } catch (err) {
      console.error('Failed to update workflow:', err)
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await toggleStatus(id)
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleRestartWorkflow = async (id) => {
    try {
      await restartWorkflow(id)
    } catch (err) {
      console.error('Failed to restart workflow:', err)
    }
  }

  const handleDeleteWorkflow = async (id) => {
    try {
      await deleteWorkflow(id)
    } catch (err) {
      console.error('Failed to delete workflow:', err)
    }
  }

  const handleSaveWorkflow = async (updatedWorkflow) => {
    try {
      await updateWorkflow(updatedWorkflow.id, updatedWorkflow)
      setCurrentWorkflow(updatedWorkflow)
    } catch (err) {
      console.error('Failed to save workflow:', err)
    }
  }

  // Poll for runtime updates when viewing an online workflow (less frequent - animation handled locally)
  useEffect(() => {
    if (page === 'editor' && (currentWorkflow?.status === 'Online' || currentWorkflow?.status === 'Idling')) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/workflows/${currentWorkflow.id}/state`)
          const state = await response.json()
          if (state.running) {
            setCurrentWorkflow(prev => ({
              ...prev,
              status: state.status,
              runtime: state,
              backendSignals: state.signals || [],
              processingNodes: state.processingNodes || []
            }))
          }
        } catch (err) {
          console.error('Failed to fetch runtime state:', err)
        }
      }, 500) // Sync with backend every 500ms - local animation handles smoothness

      return () => clearInterval(interval)
    }
  }, [page, currentWorkflow?.id, currentWorkflow?.status])

  if (page === 'editor') {
    return (
      <div className={`app-container ${theme}`}>
        <Editor
          workflow={currentWorkflow}
          customNode={editingCustomNode}
          onBack={() => {
            setPage('workflows')
            setEditingCustomNode(null)
            setWorkflowsKey(prev => prev + 1)
            refresh() // Refresh workflows from server
          }}
          onSave={handleSaveWorkflow}
          keybinds={keybinds}
          editorSettings={systemSettings}
          theme={theme}
        />
      </div>
    )
  }

  return (
    <div className={`app-container ${theme}`}>
      <aside className="sidebar">
        <div className="logo"><img src="/flowforge-512.png" alt="" />FlowForge</div>
        <nav>
          <ul>
            <li
              className={page === 'dashboard' ? 'active' : ''}
              onClick={() => setPage('dashboard')}
            >
              Dashboard
            </li>
            <li
              className={page === 'workflows' ? 'active' : ''}
              onClick={() => setPage('workflows')}
            >
              Workflows
            </li>
            <li
              className={page === 'settings' ? 'active' : ''}
              onClick={() => setPage('settings')}
            >
              Settings
            </li>
          </ul>
        </nav>
      </aside>
      <main className="content">
        {page === 'dashboard' && (
          <>
            <header>
              <h1>Dashboard</h1>
            </header>
            <div className="widgets">
              <div className="widget">
                <h3>Recent Workflows</h3>
                {workflows.length > 0 ? (
                  <ul>
                    {workflows.slice(0, 5).map(w => (
                      <li key={w.id}>{w.name} - {w.status}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No workflows found.</p>
                )}
              </div>
              <div className="widget">
                <h3>System Status</h3>
                <p>All systems operational.</p>
              </div>
            </div>
            <div style={{ color: 'red', textAlign: 'center' }}><h2>This is still development.</h2></div>
          </>
        )}

        {page === 'workflows' && (
          <Workflows
            key={workflowsKey}
            workflows={workflows}
            recentTemplates={recentTemplates}
            onCreate={handleCreateWorkflow}
            onSelectTemplate={handleSelectTemplate}
            onOpen={handleOpenWorkflow}
            onRename={handleRenameWorkflow}
            onEdit={handleEditWorkflow}
            onToggleStatus={handleToggleStatus}
            onRestart={handleRestartWorkflow}
            onDelete={handleDeleteWorkflow}
            onOpenCustomNode={handleOpenCustomNode}
            currentEngine={systemSettings.engine}
            onRefresh={refresh}
          />
        )}

        {page === 'settings' && (
          <Settings
            currentTheme={theme}
            setTheme={handleSetTheme}
            keybinds={keybinds}
            setKeybinds={handleSetKeybinds}
            systemSettings={systemSettings}
            setSystemSettings={handleSetSystemSettings}
          />
        )}
      </main>
    </div>
  )
}

export default App
