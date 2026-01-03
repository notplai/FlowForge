import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript, localCompletionSource, scopeCompletionSource } from '@codemirror/lang-javascript';
import { python, globalCompletion } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import { autocompletion, completeFromList, snippetCompletion } from '@codemirror/autocomplete';
import '../assets/styles/CodeEditor.css';

/**
 * Custom workflow-specific completions
 * These are the only "hardcoded" items - specific to the workflow system
 */
const WORKFLOW_COMPLETIONS = [
    snippetCompletion('workflowStorage.get(${key})', {
        label: 'workflowStorage.get',
        type: 'method',
        detail: '(key)',
        info: 'Get value from workflow storage'
    }),
    snippetCompletion('workflowStorage.set(${key}, ${value})', {
        label: 'workflowStorage.set',
        type: 'method',
        detail: '(key, value)',
        info: 'Set value in workflow storage'
    }),
    snippetCompletion('workflowStorage.has(${key})', {
        label: 'workflowStorage.has',
        type: 'method',
        detail: '(key)',
        info: 'Check if key exists in workflow storage'
    }),
    snippetCompletion('workflowStorage.delete(${key})', {
        label: 'workflowStorage.delete',
        type: 'method',
        detail: '(key)',
        info: 'Delete key from workflow storage'
    }),
    snippetCompletion('workflowStorage.clear()', {
        label: 'workflowStorage.clear',
        type: 'method',
        detail: '()',
        info: 'Clear all workflow storage'
    }),
    {
        label: 'workflowStorage',
        type: 'variable',
        detail: 'object',
        info: 'Workflow-scoped storage (persists during workflow run)'
    },
];

/**
 * Common code snippets for JavaScript
 */
const JS_SNIPPETS = [
    snippetCompletion('console.log(${expr})', {
        label: 'log',
        type: 'function',
        detail: 'console.log',
        info: 'Log to console'
    }),
    snippetCompletion('const ${name} = ${value}', {
        label: 'const',
        type: 'keyword',
        detail: 'declaration',
        info: 'Declare constant variable'
    }),
    snippetCompletion('let ${name} = ${value}', {
        label: 'let',
        type: 'keyword',
        detail: 'declaration',
        info: 'Declare block-scoped variable'
    }),
    snippetCompletion('function ${name}(${params}) {\n\t${body}\n}', {
        label: 'function',
        type: 'keyword',
        detail: 'declaration',
        info: 'Declare function'
    }),
    snippetCompletion('const ${name} = (${params}) => {\n\t${body}\n}', {
        label: 'arrow',
        type: 'function',
        detail: 'arrow function',
        info: 'Declare arrow function'
    }),
    snippetCompletion('async function ${name}(${params}) {\n\t${body}\n}', {
        label: 'async',
        type: 'keyword',
        detail: 'async function',
        info: 'Declare async function'
    }),
    snippetCompletion('if (${condition}) {\n\t${body}\n}', {
        label: 'if',
        type: 'keyword',
        detail: 'statement',
        info: 'If statement'
    }),
    snippetCompletion('if (${condition}) {\n\t${then}\n} else {\n\t${else}\n}', {
        label: 'ifelse',
        type: 'keyword',
        detail: 'statement',
        info: 'If-else statement'
    }),
    snippetCompletion('for (let ${i} = 0; ${i} < ${length}; ${i}++) {\n\t${body}\n}', {
        label: 'for',
        type: 'keyword',
        detail: 'loop',
        info: 'For loop'
    }),
    snippetCompletion('for (const ${item} of ${array}) {\n\t${body}\n}', {
        label: 'forof',
        type: 'keyword',
        detail: 'loop',
        info: 'For-of loop'
    }),
    snippetCompletion('for (const ${key} in ${object}) {\n\t${body}\n}', {
        label: 'forin',
        type: 'keyword',
        detail: 'loop',
        info: 'For-in loop'
    }),
    snippetCompletion('while (${condition}) {\n\t${body}\n}', {
        label: 'while',
        type: 'keyword',
        detail: 'loop',
        info: 'While loop'
    }),
    snippetCompletion('try {\n\t${try}\n} catch (${error}) {\n\t${catch}\n}', {
        label: 'trycatch',
        type: 'keyword',
        detail: 'error handling',
        info: 'Try-catch block'
    }),
    snippetCompletion('try {\n\t${try}\n} catch (${error}) {\n\t${catch}\n} finally {\n\t${finally}\n}', {
        label: 'tryfinally',
        type: 'keyword',
        detail: 'error handling',
        info: 'Try-catch-finally block'
    }),
    snippetCompletion('switch (${expr}) {\n\tcase ${value}:\n\t\t${body}\n\t\tbreak;\n\tdefault:\n\t\t${default}\n}', {
        label: 'switch',
        type: 'keyword',
        detail: 'statement',
        info: 'Switch statement'
    }),
    snippetCompletion('class ${Name} {\n\tconstructor(${params}) {\n\t\t${body}\n\t}\n}', {
        label: 'class',
        type: 'keyword',
        detail: 'declaration',
        info: 'Class declaration'
    }),
    snippetCompletion('/** ${description} */', {
        label: 'jsdoc',
        type: 'text',
        detail: 'comment',
        info: 'JSDoc comment'
    }),
    snippetCompletion('/**\n * ${description}\n * @param {${type}} ${name} - ${desc}\n * @returns {${returnType}} ${returnDesc}\n */', {
        label: 'jsdocfn',
        type: 'text',
        detail: 'function comment',
        info: 'JSDoc function comment'
    }),
];

/**
 * Common code snippets for Python
 */
const PY_SNIPPETS = [
    snippetCompletion('print(${expr})', {
        label: 'print',
        type: 'function',
        detail: 'output',
        info: 'Print to console'
    }),
    snippetCompletion('def ${name}(${params}):\n\t${body}', {
        label: 'def',
        type: 'keyword',
        detail: 'function',
        info: 'Define function'
    }),
    snippetCompletion('async def ${name}(${params}):\n\t${body}', {
        label: 'asyncdef',
        type: 'keyword',
        detail: 'async function',
        info: 'Define async function'
    }),
    snippetCompletion('class ${Name}:\n\tdef __init__(self${, params}):\n\t\t${body}', {
        label: 'class',
        type: 'keyword',
        detail: 'declaration',
        info: 'Class declaration'
    }),
    snippetCompletion('if ${condition}:\n\t${body}', {
        label: 'if',
        type: 'keyword',
        detail: 'statement',
        info: 'If statement'
    }),
    snippetCompletion('if ${condition}:\n\t${then}\nelse:\n\t${else}', {
        label: 'ifelse',
        type: 'keyword',
        detail: 'statement',
        info: 'If-else statement'
    }),
    snippetCompletion('if ${condition}:\n\t${then}\nelif ${condition2}:\n\t${elif}\nelse:\n\t${else}', {
        label: 'ifelif',
        type: 'keyword',
        detail: 'statement',
        info: 'If-elif-else statement'
    }),
    snippetCompletion('for ${item} in ${iterable}:\n\t${body}', {
        label: 'for',
        type: 'keyword',
        detail: 'loop',
        info: 'For loop'
    }),
    snippetCompletion('for ${i}, ${item} in enumerate(${iterable}):\n\t${body}', {
        label: 'forenum',
        type: 'keyword',
        detail: 'loop',
        info: 'For loop with enumerate'
    }),
    snippetCompletion('while ${condition}:\n\t${body}', {
        label: 'while',
        type: 'keyword',
        detail: 'loop',
        info: 'While loop'
    }),
    snippetCompletion('try:\n\t${try}\nexcept ${Exception} as ${e}:\n\t${except}', {
        label: 'tryexcept',
        type: 'keyword',
        detail: 'error handling',
        info: 'Try-except block'
    }),
    snippetCompletion('try:\n\t${try}\nexcept ${Exception} as ${e}:\n\t${except}\nfinally:\n\t${finally}', {
        label: 'tryfinally',
        type: 'keyword',
        detail: 'error handling',
        info: 'Try-except-finally block'
    }),
    snippetCompletion('with ${context} as ${var}:\n\t${body}', {
        label: 'with',
        type: 'keyword',
        detail: 'context manager',
        info: 'With statement'
    }),
    snippetCompletion('lambda ${params}: ${expr}', {
        label: 'lambda',
        type: 'keyword',
        detail: 'anonymous function',
        info: 'Lambda expression'
    }),
    snippetCompletion('[${expr} for ${item} in ${iterable}]', {
        label: 'listcomp',
        type: 'keyword',
        detail: 'list comprehension',
        info: 'List comprehension'
    }),
    snippetCompletion('[${expr} for ${item} in ${iterable} if ${condition}]', {
        label: 'listcompif',
        type: 'keyword',
        detail: 'list comprehension',
        info: 'List comprehension with condition'
    }),
    snippetCompletion('{${key}: ${value} for ${item} in ${iterable}}', {
        label: 'dictcomp',
        type: 'keyword',
        detail: 'dict comprehension',
        info: 'Dictionary comprehension'
    }),
    snippetCompletion('"""${description}"""', {
        label: 'docstring',
        type: 'text',
        detail: 'comment',
        info: 'Docstring'
    }),
    snippetCompletion('"""\n${description}\n\nArgs:\n\t${arg}: ${desc}\n\nReturns:\n\t${returns}\n"""', {
        label: 'docstringfn',
        type: 'text',
        detail: 'function docstring',
        info: 'Function docstring (Google style)'
    }),
];

/**
 * Create completion source with workflow-specific items
 */
const workflowCompletionSource = completeFromList(WORKFLOW_COMPLETIONS);

/**
 * CodeEditor Component using CodeMirror's built-in language intelligence
 */
const CodeEditor = ({ value, onChange, language = 'javascript', theme = 'dark' }) => {
    const [size, setSize] = useState({ width: '100%', height: 400 });
    const containerRef = useRef(null);
    const isResizing = useRef(false);

    const extensions = useMemo(() => {
        const langExtensions = [];

        if (language === 'javascript') {
            // Use JavaScript language with built-in completions
            langExtensions.push(javascript({ jsx: true }));

            // Add JavaScript snippets
            langExtensions.push(
                autocompletion({
                    override: [
                        // Global scope completions (console, Math, JSON, Array, etc.)
                        scopeCompletionSource(globalThis),
                        // Local variable completions (variables defined in the code)
                        localCompletionSource,
                        // Workflow-specific completions
                        workflowCompletionSource,
                        // Code snippets
                        completeFromList(JS_SNIPPETS),
                    ],
                    defaultKeymap: true,
                    activateOnTyping: true,
                    icons: true,
                })
            );
        } else if (language === 'python') {
            // Use Python language with built-in completions
            langExtensions.push(python());

            // Add Python snippets
            langExtensions.push(
                autocompletion({
                    override: [
                        // Built-in global completions from Python language
                        globalCompletion,
                        // Workflow-specific completions
                        workflowCompletionSource,
                        // Code snippets
                        completeFromList(PY_SNIPPETS),
                    ],
                    defaultKeymap: true,
                    activateOnTyping: true,
                    icons: true,
                })
            );
        }

        return langExtensions;
    }, [language]);

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
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightActiveLine: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: false, // We handle this ourselves
                    rectangularSelection: true,
                    crosshairCursor: false,
                    highlightSelectionMatches: true,
                }}
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
