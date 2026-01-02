import React, { useState, useEffect } from 'react';

import dockerIcon from '../assets/icons/docker.svg';
import jsonIcon from '../assets/icons/json.svg';
import questionIcon from '../assets/icons/question.svg';

const CustomDropdown = ({ options, value, onChange, currentTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="custom-dropdown" style={{ position: 'relative', width: '100%' }}>
            <div
                className="dropdown-selected"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    border: `1px solid ${currentTheme === 'dark' ? '#444' : '#ccc'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: currentTheme === 'dark' ? '#2c2c2c' : '#fff',
                    color: currentTheme === 'dark' ? '#fff' : '#333',
                    transition: 'all 0.2s'
                }}
            >
                <img src={selectedOption.icon} alt="" style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                <span>{selectedOption.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
            </div>
            {isOpen && (
                <div
                    className="dropdown-options"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        border: `1px solid ${currentTheme === 'dark' ? '#444' : '#ccc'}`,
                        borderRadius: '6px',
                        marginTop: '5px',
                        backgroundColor: currentTheme === 'dark' ? '#2c2c2c' : '#fff',
                        zIndex: 1000,
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    {options.map(option => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className="dropdown-option"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: `1px solid ${currentTheme === 'dark' ? '#444' : '#eee'}`,
                                backgroundColor: value === option.value ? (currentTheme === 'dark' ? '#3a3a3a' : '#f0f0f0') : 'transparent',
                                color: currentTheme === 'dark' ? '#fff' : '#333'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme === 'dark' ? '#3a3a3a' : '#f9f9f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === option.value ? (currentTheme === 'dark' ? '#3a3a3a' : '#f0f0f0') : 'transparent'}
                        >
                            <img src={option.icon} alt="" style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                            <span>{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function Settings({ currentTheme, setTheme, keybinds, setKeybinds, systemSettings, setSystemSettings }) {
    const [recordingKey, setRecordingKey] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (recordingKey) {
                e.preventDefault();
                e.stopPropagation();

                let key = e.key;
                if (key === ' ') key = 'Space';
                if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;

                let combo = '';
                if (e.ctrlKey) combo += 'Ctrl+';
                if (e.altKey) combo += 'Alt+';
                if (e.shiftKey) combo += 'Shift+';
                if (e.metaKey) combo += 'Meta+';

                combo += key.length === 1 ? key.toUpperCase() : key;

                setKeybinds({ ...keybinds, [recordingKey]: combo });
                setRecordingKey(null);
            }
        };

        if (recordingKey) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [recordingKey, keybinds, setKeybinds]);

    return (
        <div className="settings-page">
            <header>
                <h1>Settings</h1>
            </header>
            <div className="settings-content">
                <div className="setting-item">
                    <h2>Theme</h2>
                    <div className="theme-selector">
                        <div
                            className={`theme-option ${currentTheme === 'light' ? 'selected' : ''}`}
                            onClick={() => setTheme('light')}
                            title="Light Mode"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        </div>
                        <div
                            className={`theme-option ${currentTheme === 'dark' ? 'selected' : ''}`}
                            onClick={() => setTheme('dark')}
                            title="Dark Mode"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="setting-item">
                    <h2>Keybindings</h2>
                    <h3>Cursor Tools</h3>
                    <div className="keybind-list">
                        <div className="keybind-row">
                            <span>Tool Menu</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'toolMenu' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('toolMenu')}
                            >
                                {recordingKey === 'toolMenu' ? 'Press any key...' : (keybinds?.toolMenu || 'Tab')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Pointer Tool</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'toolPointer' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('toolPointer')}
                            >
                                {recordingKey === 'toolPointer' ? 'Press any key...' : (keybinds?.toolPointer || 'V')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Grab Tool</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'toolGrab' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('toolGrab')}
                            >
                                {recordingKey === 'toolGrab' ? 'Press any key...' : (keybinds?.toolGrab || 'B')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Help Tool</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'toolHelp' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('toolHelp')}
                            >
                                {recordingKey === 'toolHelp' ? 'Press any key...' : (keybinds?.toolHelp || 'H')}
                            </button>
                        </div>
                    </div>
                    <br />
                    <h3>Utilities</h3>
                    <div className="keybind-list">
                        <div className="keybind-row">
                            <span>Save Workflow</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'save' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('save')}
                            >
                                {recordingKey === 'save' ? 'Press any key...' : (keybinds?.save || 'Ctrl+S')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Undo</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'undo' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('undo')}
                            >
                                {recordingKey === 'undo' ? 'Press any key...' : (keybinds?.undo || 'Ctrl+Z')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Redo</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'redo' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('redo')}
                            >
                                {recordingKey === 'redo' ? 'Press any key...' : (keybinds?.redo || 'Ctrl+Y')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Copy</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'copy' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('copy')}
                            >
                                {recordingKey === 'copy' ? 'Press any key...' : (keybinds?.copy || 'Ctrl+C')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Paste</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'paste' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('paste')}
                            >
                                {recordingKey === 'paste' ? 'Press any key...' : (keybinds?.paste || 'Ctrl+V')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Delete Node</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'delete' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('delete')}
                            >
                                {recordingKey === 'delete' ? 'Press any key...' : (keybinds?.delete || 'Backspace')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Escape / Turn Back</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'escape' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('escape')}
                            >
                                {recordingKey === 'escape' ? 'Press any key...' : (keybinds?.escape || 'Escape')}
                            </button>
                        </div>
                        <div className="keybind-row">
                            <span>Code Completion</span>
                            <button
                                className={`keybind-btn ${recordingKey === 'codeCompletion' ? 'recording' : ''}`}
                                onClick={() => setRecordingKey('codeCompletion')}
                            >
                                {recordingKey === 'codeCompletion' ? 'Press any key...' : (keybinds?.codeCompletion || 'Ctrl+Space')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="setting-item">
                    <h2>System Configuration</h2>
                    <div className="config-grid">
                        <div className="config-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>Workflow Engine</h3>
                                <div className="tooltip-container">
                                    <img
                                        src={questionIcon}
                                        alt="Help"
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            cursor: 'help',
                                            opacity: 0.7,
                                            filter: currentTheme === 'dark' ? 'invert(1)' : 'none'
                                        }}
                                    />
                                    <span className="tooltip-text">Changing the Workflow Engine may disable instances created with the previous engine.</span>
                                </div>
                            </div>
                            <CustomDropdown
                                options={[
                                    { value: 'json', label: 'JSON File', icon: jsonIcon },
                                    { value: 'docker', label: 'Docker Container', icon: dockerIcon }
                                ]}
                                value={systemSettings?.engine || 'json'}
                                onChange={(val) => setSystemSettings({ ...systemSettings, engine: val })}
                                currentTheme={currentTheme}
                            />
                        </div>
                        <div className="config-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>Code Completion Delay</h3>
                                <div className="tooltip-container">
                                    <img
                                        src={questionIcon}
                                        alt="Help"
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            cursor: 'help',
                                            opacity: 0.7,
                                            filter: currentTheme === 'dark' ? 'invert(1)' : 'none'
                                        }}
                                    />
                                    <span className="tooltip-text">Delay in milliseconds before showing code completions. Set to 0 for instant suggestions.</span>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={systemSettings?.autoCompleteDelay ?? 50}
                                onChange={(e) => setSystemSettings({ ...systemSettings, autoCompleteDelay: Math.max(0, parseInt(e.target.value) || 0) })}
                                style={{
                                    padding: '10px',
                                    border: `1px solid ${currentTheme === 'dark' ? '#444' : '#ccc'}`,
                                    borderRadius: '6px',
                                    backgroundColor: currentTheme === 'dark' ? '#2c2c2c' : '#fff',
                                    color: currentTheme === 'dark' ? '#fff' : '#333',
                                    width: '100%',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;

