import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import { autocompletion } from '@codemirror/autocomplete';
import '../assets/styles/CodeEditor.css';

// Import completions from separate modules
import {
    JS_DOC_COMMENTS,
    JS_BUILTINS,
    JS_KEYWORDS,
    JS_ARRAY_METHODS,
    JS_STRING_METHODS,
    PY_DOC_COMMENTS,
    PY_BUILTINS,
    PY_KEYWORDS,
    PY_MODULES,
    PY_LIST_METHODS,
    PY_STRING_METHODS,
    PY_DICT_METHODS,
    TYPE_ICONS,
    TYPE_COLORS,
} from '../utils/completions';

function getTypeIcon(type) {
    return TYPE_ICONS[type] || type.default;
}
function getTypeColor(type, isDark) {
    const colors = isDark ? TYPE_COLORS.dark : TYPE_COLORS.light;
    return colors[type] || colors.default;
}

function extractWords(code) {
    const words = new Set();
    const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/g;
    let match;
    while ((match = wordRegex.exec(code)) !== null) {
        words.add(match[1]);
    }
    return Array.from(words);
}

function extractUserDefinitions(code, language) {
    const definitions = [];

    if (language === 'javascript') {
        // Match const/let/var declarations
        const varRegex = /(?:const|let|var)\s+(\w+)/g;
        let match;
        while ((match = varRegex.exec(code)) !== null) {
            definitions.push({
                label: match[1],
                type: 'variable',
                description: 'User-defined variable'
            });
        }

        // Match function declarations
        const funcRegex = /function\s+(\w+)\s*\(/g;
        while ((match = funcRegex.exec(code)) !== null) {
            definitions.push({
                label: match[1],
                type: 'function',
                description: 'User-defined function'
            });
        }

        // Match arrow functions assigned to const/let
        const arrowRegex = /(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
        while ((match = arrowRegex.exec(code)) !== null) {
            if (!definitions.find(d => d.label === match[1])) {
                definitions.push({
                    label: match[1],
                    type: 'function',
                    description: 'User-defined function'
                });
            }
        }
    } else if (language === 'python') {
        // Match variable assignments
        const varRegex = /^(\w+)\s*=/gm;
        let match;
        while ((match = varRegex.exec(code)) !== null) {
            if (!['def', 'class', 'if', 'for', 'while', 'True', 'False', 'None'].includes(match[1])) {
                definitions.push({
                    label: match[1],
                    type: 'variable',
                    description: 'User-defined variable'
                });
            }
        }

        // Match function definitions
        const funcRegex = /def\s+(\w+)\s*\(/g;
        while ((match = funcRegex.exec(code)) !== null) {
            definitions.push({
                label: match[1],
                type: 'function',
                description: 'User-defined function'
            });
        }

        // Match class definitions
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            definitions.push({
                label: match[1],
                type: 'class',
                description: 'User-defined class'
            });
        }
    }

    return definitions;
}

function getAllCompletions(language) {
    const completions = [];
    const builtins = language === 'javascript' ? JS_BUILTINS : PY_BUILTINS;
    const keywords = language === 'javascript' ? JS_KEYWORDS : PY_KEYWORDS;

    // Add all keywords
    keywords.forEach(kw => {
        completions.push({
            label: kw.label,
            insertText: kw.label,
            type: kw.type,
            description: kw.description
        });
    });

    // Add all built-in objects/functions
    Object.entries(builtins).forEach(([name, info]) => {
        if (info.type === 'function' || info.type === 'class') {
            completions.push({
                label: name,
                insertText: name,
                type: info.type,
                signature: info.signature,
                description: info.description
            });
        } else {
            completions.push({
                label: name,
                insertText: name,
                type: info.type || 'object',
                description: info.description
            });
        }
    });

    // Add Python modules if Python
    if (language === 'python') {
        Object.entries(PY_MODULES).forEach(([name, info]) => {
            completions.push({
                label: name,
                insertText: name,
                type: 'module',
                description: info.description
            });
        });
    }

    // Sort completions
    completions.sort((a, b) => {
        const typePriority = { keyword: 1, function: 2, method: 3, object: 4, class: 5, module: 6, variable: 7, doc: 8, word: 9 };
        const aPriority = typePriority[a.type] || 10;
        const bPriority = typePriority[b.type] || 10;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.label.localeCompare(b.label);
    });

    return completions;
}

function getCompletions(code, cursorPosition, language, isExplicit = false) {
    // Get the text before cursor
    const textBeforeCursor = code.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Check if we're in a doc comment context (after /** or """)
    const isInJsDoc = language === 'javascript' && /\/\*\*[^*]*$/.test(textBeforeCursor);
    const isInPyDoc = language === 'python' && /"""[^"]*$/.test(textBeforeCursor);
    const docComments = language === 'javascript' ? JS_DOC_COMMENTS : PY_DOC_COMMENTS;

    // Check if we're after a dot
    const dotMatch = currentLine.match(/(\w+)\.\s*(\w*)$/);
    if (dotMatch) {
        const objectName = dotMatch[1];
        const partial = dotMatch[2].toLowerCase();

        // Get object completions
        const builtins = language === 'javascript' ? JS_BUILTINS : PY_BUILTINS;
        const obj = builtins[objectName];

        if (obj && obj.methods) {
            return Object.entries(obj.methods)
                .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                .map(([name, info]) => ({
                    label: name,
                    insertText: name,
                    type: 'method',
                    signature: info.signature,
                    description: info.description,
                    objectName
                }));
        }

        // Check for Python module completions
        if (language === 'python' && PY_MODULES[objectName]) {
            const mod = PY_MODULES[objectName];
            return Object.entries(mod.methods)
                .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                .map(([name, info]) => ({
                    label: name,
                    insertText: name,
                    type: 'method',
                    signature: info.signature,
                    description: info.description,
                    objectName
                }));
        }

        // Generic array/string method suggestions based on common patterns
        if (language === 'javascript') {
            // Check if it looks like an array
            const arrayPattern = new RegExp(`(const|let|var)\\s+${objectName}\\s*=\\s*\\[`);
            if (arrayPattern.test(code)) {
                return Object.entries(JS_ARRAY_METHODS)
                    .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                    .map(([name, info]) => ({
                        label: name,
                        insertText: name,
                        type: 'method',
                        signature: info.signature,
                        description: info.description,
                        objectName
                    }));
            }
            // Check if it looks like a string
            const stringPattern = new RegExp(`(const|let|var)\\s+${objectName}\\s*=\\s*['"\`]`);
            if (stringPattern.test(code)) {
                return Object.entries(JS_STRING_METHODS)
                    .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                    .map(([name, info]) => ({
                        label: name,
                        insertText: name,
                        type: 'method',
                        signature: info.signature,
                        description: info.description,
                        objectName
                    }));
            }
        }

        if (language === 'python') {
            // Check if it looks like a list
            const listPattern = new RegExp(`${objectName}\\s*=\\s*\\[`);
            if (listPattern.test(code)) {
                return Object.entries(PY_LIST_METHODS)
                    .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                    .map(([name, info]) => ({
                        label: name,
                        insertText: name,
                        type: 'method',
                        signature: info.signature,
                        description: info.description,
                        objectName
                    }));
            }
            // Check if it looks like a string
            const stringPattern = new RegExp(`${objectName}\\s*=\\s*['"]`);
            if (stringPattern.test(code)) {
                return Object.entries(PY_STRING_METHODS)
                    .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                    .map(([name, info]) => ({
                        label: name,
                        insertText: name,
                        type: 'method',
                        signature: info.signature,
                        description: info.description,
                        objectName
                    }));
            }
            // Check if it looks like a dict
            const dictPattern = new RegExp(`${objectName}\\s*=\\s*\\{`);
            if (dictPattern.test(code)) {
                return Object.entries(PY_DICT_METHODS)
                    .filter(([name]) => !partial || name.toLowerCase().startsWith(partial))
                    .map(([name, info]) => ({
                        label: name,
                        insertText: name,
                        type: 'method',
                        signature: info.signature,
                        description: info.description,
                        objectName
                    }));
            }
        }

        return [];
    }

    // Get the current word being typed
    const wordMatch = currentLine.match(/(\w+)$/);
    const partial = wordMatch ? wordMatch[1].toLowerCase() : '';

    // If no partial and triggered explicitly, show all completions
    if (!partial && isExplicit) {
        return getAllCompletions(language).slice(0, 30);
    }

    // If no partial and not explicit, return empty
    if (!partial) return [];

    const completions = [];
    const builtins = language === 'javascript' ? JS_BUILTINS : PY_BUILTINS;
    const keywords = language === 'javascript' ? JS_KEYWORDS : PY_KEYWORDS;

    // Add matching keywords
    keywords
        .filter(kw => kw.label.toLowerCase().startsWith(partial))
        .forEach(kw => {
            completions.push({
                label: kw.label,
                insertText: kw.label,
                type: kw.type,
                description: kw.description
            });
        });

    // Add matching built-in objects/functions
    Object.entries(builtins)
        .filter(([name]) => name.toLowerCase().startsWith(partial))
        .forEach(([name, info]) => {
            if (info.type === 'function' || info.type === 'class') {
                completions.push({
                    label: name,
                    insertText: name,
                    type: info.type,
                    signature: info.signature,
                    description: info.description
                });
            } else {
                completions.push({
                    label: name,
                    insertText: name,
                    type: info.type || 'object',
                    description: info.description
                });
            }
        });

    // Add Python modules if applicable
    if (language === 'python') {
        Object.entries(PY_MODULES)
            .filter(([name]) => name.toLowerCase().startsWith(partial))
            .forEach(([name, info]) => {
                completions.push({
                    label: name,
                    insertText: name,
                    type: 'module',
                    description: info.description
                });
            });
    }

    // Add user-defined completions
    const userDefs = extractUserDefinitions(code, language);
    userDefs
        .filter(def => def.label.toLowerCase().startsWith(partial) && def.label.toLowerCase() !== partial)
        .forEach(def => {
            if (!completions.find(c => c.label === def.label)) {
                completions.push(def);
            }
        });

    // Add word recognition (words from code that aren't already added)
    const words = extractWords(code);
    words
        .filter(word => word.toLowerCase().startsWith(partial) && word.toLowerCase() !== partial)
        .forEach(word => {
            if (!completions.find(c => c.label === word)) {
                completions.push({
                    label: word,
                    insertText: word,
                    type: 'word',
                    description: 'Word from code'
                });
            }
        });

    // Add doc comment completions if in doc context or starting with @ or :
    if (isInJsDoc || isInPyDoc || (language === 'javascript' && partial.startsWith('@')) || (language === 'python' && partial.startsWith(':'))) {
        docComments
            .filter(doc => doc.label.toLowerCase().includes(partial.toLowerCase()) || partial === '')
            .forEach(doc => {
                completions.push({
                    ...doc,
                    insertText: doc.insertText.replace(/\$[0-9]/g, '')
                });
            });
    }

    if ((language === 'javascript' && (partial === '/' || currentLine.trim() === '/')) ||
        (language === 'python' && (partial === '"' || currentLine.trim() === '"'))) {
        docComments.slice(0, 2).forEach(doc => {
            completions.push({
                ...doc,
                insertText: doc.insertText.replace(/\$[0-9]/g, '')
            });
        });
    }

    completions.sort((a, b) => {
        const aExact = a.label.toLowerCase().startsWith(partial);
        const bExact = b.label.toLowerCase().startsWith(partial);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Sort by type priority
        const typePriority = { keyword: 1, function: 2, method: 3, object: 4, class: 5, module: 6, variable: 7, doc: 8, word: 9 };
        const aPriority = typePriority[a.type] || 10;
        const bPriority = typePriority[b.type] || 10;
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.label.localeCompare(b.label);
    });

    return completions.slice(0, 20);
}

const customCompletionSource = (language, code) => (context) => {
    const pos = context.pos;
    const word = context.matchBefore(/\w*/);
    const isExplicit = context.explicit;

    // Allow explicit trigger on empty line
    if (!isExplicit && (!word || (word.from === word.to))) {
        return null;
    }

    const completions = getCompletions(code, pos, language, isExplicit);

    if (completions.length === 0) {
        return null;
    }

    return {
        from: word ? word.from : pos,
        options: completions.map(c => ({
            label: c.label,
            apply: c.insertText,
            type: c.type,
            detail: c.signature || '',
            info: c.description,
            // Custom rendering with icons
            // displayLabel: `${getTypeIcon(c.type)}${c.label}`,
            displayLabel: c.label,
        })),
        validFor: /^\w*$/,
    };
};

const CodeEditor = ({ value, onChange, language = 'javascript', theme = 'dark' }) => {
    const [size, setSize] = useState({ width: '100%', height: 400 });
    const containerRef = useRef(null);
    const isResizing = useRef(false);

    const extensions = useMemo(() => {
        const langExtensions = [];
        if (language === 'javascript') {
            langExtensions.push(javascript({ jsx: true }));
        } else if (language === 'python') {
            langExtensions.push(python());
        }
        langExtensions.push(autocompletion({
            override: [customCompletionSource(language, value)],
            defaultKeymap: true,
            activateOnTyping: true,
        }));
        return langExtensions;
    }, [language, value]);

    const selectedTheme = useMemo(() => {
        return theme === 'dark' ? vscodeDark : githubLight;
    }, [theme]);

    const handleChange = useCallback((val) => {
        onChange(val);
    }, [onChange]);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = e.clientY - containerRect.top;

        setSize(prevSize => ({
            width: prevSize.width,
            height: Math.max(100, newHeight)
        }));
    }, []);

    const handleMouseUpRef = useRef(null);
    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        if (handleMouseUpRef.current) {
            document.removeEventListener('mouseup', handleMouseUpRef.current);
        }
    }, [handleMouseMove]);

    useLayoutEffect(() => {
        handleMouseUpRef.current = handleMouseUp;
    });

    const handleMouseDown = (e) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUpRef.current);
    };

    useEffect(() => {
        const mouseUpHandler = handleMouseUpRef.current;
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            if (mouseUpHandler) {
                document.removeEventListener('mouseup', mouseUpHandler);
            }
        };
    }, [handleMouseMove]);

    return (
        <div
            ref={containerRef}
            className={`code-editor-resizable-container theme-${theme}`}
            style={{ width: size.width, height: size.height }}
        >
            <CodeMirror
                value={value}
                height="100%"
                extensions={extensions}
                theme={selectedTheme}
                onChange={handleChange}
                style={{
                    height: '100%',
                    flex: 1,
                }}
            />
            <div
                className="code-editor-resize-handle"
                onMouseDown={handleMouseDown}
            />
        </div>
    );
};

export default CodeEditor;
