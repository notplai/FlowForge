import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// JSDoc/docstring comment templates
const JS_DOC_COMMENTS = [
    { label: '/** */', insertText: '/** $0 */', type: 'doc', description: 'Single-line JSDoc comment' },
    { label: '/** ... */', insertText: '/**\n * $0\n */', type: 'doc', description: 'Multi-line JSDoc comment' },
    { label: '@param', insertText: '@param {$1} $2 - $3', type: 'doc', description: 'Document a parameter' },
    { label: '@returns', insertText: '@returns {$1} $2', type: 'doc', description: 'Document return value' },
    { label: '@type', insertText: '@type {$1}', type: 'doc', description: 'Document type' },
    { label: '@typedef', insertText: '@typedef {$1} $2', type: 'doc', description: 'Define a type' },
    { label: '@description', insertText: '@description $1', type: 'doc', description: 'Add description' },
    { label: '@example', insertText: '@example\n * $1', type: 'doc', description: 'Add code example' },
    { label: '@deprecated', insertText: '@deprecated $1', type: 'doc', description: 'Mark as deprecated' },
    { label: '@throws', insertText: '@throws {$1} $2', type: 'doc', description: 'Document thrown error' },
    { label: '@async', insertText: '@async', type: 'doc', description: 'Mark as async' },
    { label: '@private', insertText: '@private', type: 'doc', description: 'Mark as private' },
    { label: '@public', insertText: '@public', type: 'doc', description: 'Mark as public' },
];

const PY_DOC_COMMENTS = [
    { label: '""" """', insertText: '"""$0"""', type: 'doc', description: 'Single-line docstring' },
    { label: '""" ... """', insertText: '"""\n$0\n"""', type: 'doc', description: 'Multi-line docstring' },
    { label: ':param', insertText: ':param $1: $2', type: 'doc', description: 'Document a parameter' },
    { label: ':returns:', insertText: ':returns: $1', type: 'doc', description: 'Document return value' },
    { label: ':rtype:', insertText: ':rtype: $1', type: 'doc', description: 'Return type' },
    { label: ':raises:', insertText: ':raises $1: $2', type: 'doc', description: 'Document raised exception' },
    { label: ':type:', insertText: ':type $1: $2', type: 'doc', description: 'Variable type' },
    { label: ':Example:', insertText: ':Example:\n    $1', type: 'doc', description: 'Add code example' },
];

// JavaScript built-in completions
const JS_BUILTINS = {
    // Console methods
    console: {
        type: 'object',
        description: 'Console object for logging',
        methods: {
            log: { signature: 'log(...args)', description: 'Log a message to the console' },
            info: { signature: 'info(...args)', description: 'Log an info message' },
            warn: { signature: 'warn(...args)', description: 'Log a warning message' },
            error: { signature: 'error(...args)', description: 'Log an error message' },
            debug: { signature: 'debug(...args)', description: 'Log a debug message' },
            table: { signature: 'table(data)', description: 'Display data as a table' },
            clear: { signature: 'clear()', description: 'Clear the console' },
            time: { signature: 'time(label)', description: 'Start a timer' },
            timeEnd: { signature: 'timeEnd(label)', description: 'End a timer' },
            group: { signature: 'group(label)', description: 'Create a new inline group' },
            groupEnd: { signature: 'groupEnd()', description: 'Exit current inline group' },
        }
    },
    // Math object
    Math: {
        type: 'object',
        description: 'Math object for mathematical operations',
        methods: {
            abs: { signature: 'abs(x)', description: 'Returns absolute value' },
            ceil: { signature: 'ceil(x)', description: 'Round up to nearest integer' },
            floor: { signature: 'floor(x)', description: 'Round down to nearest integer' },
            round: { signature: 'round(x)', description: 'Round to nearest integer' },
            max: { signature: 'max(...values)', description: 'Returns largest value' },
            min: { signature: 'min(...values)', description: 'Returns smallest value' },
            pow: { signature: 'pow(base, exp)', description: 'Returns base^exp' },
            sqrt: { signature: 'sqrt(x)', description: 'Returns square root' },
            random: { signature: 'random()', description: 'Returns random number 0-1' },
            sin: { signature: 'sin(x)', description: 'Returns sine of x' },
            cos: { signature: 'cos(x)', description: 'Returns cosine of x' },
            tan: { signature: 'tan(x)', description: 'Returns tangent of x' },
            PI: { signature: 'PI', description: 'Pi constant (~3.14159)' },
            E: { signature: 'E', description: 'Euler\'s number (~2.718)' },
        }
    },
    // JSON object
    JSON: {
        type: 'object',
        description: 'JSON parsing and stringifying',
        methods: {
            parse: { signature: 'parse(text)', description: 'Parse JSON string to object' },
            stringify: { signature: 'stringify(obj, replacer?, space?)', description: 'Convert object to JSON string' },
        }
    },
    // Date object
    Date: {
        type: 'class',
        description: 'Date and time handling',
        methods: {
            now: { signature: 'now()', description: 'Returns current timestamp in ms' },
            parse: { signature: 'parse(dateString)', description: 'Parse date string to timestamp' },
        }
    },
    // Global functions
    setTimeout: { type: 'function', signature: 'setTimeout(callback, delay, ...args)', description: 'Execute callback after delay' },
    setInterval: { type: 'function', signature: 'setInterval(callback, delay, ...args)', description: 'Execute callback repeatedly' },
    clearTimeout: { type: 'function', signature: 'clearTimeout(timeoutId)', description: 'Cancel a timeout' },
    clearInterval: { type: 'function', signature: 'clearInterval(intervalId)', description: 'Cancel an interval' },
    parseInt: { type: 'function', signature: 'parseInt(string, radix?)', description: 'Parse string to integer' },
    parseFloat: { type: 'function', signature: 'parseFloat(string)', description: 'Parse string to float' },
    isNaN: { type: 'function', signature: 'isNaN(value)', description: 'Check if value is NaN' },
    isFinite: { type: 'function', signature: 'isFinite(value)', description: 'Check if value is finite' },
    encodeURI: { type: 'function', signature: 'encodeURI(uri)', description: 'Encode a URI' },
    decodeURI: { type: 'function', signature: 'decodeURI(uri)', description: 'Decode a URI' },
    encodeURIComponent: { type: 'function', signature: 'encodeURIComponent(str)', description: 'Encode URI component' },
    decodeURIComponent: { type: 'function', signature: 'decodeURIComponent(str)', description: 'Decode URI component' },
    // Workflow-specific
    workflowStorage: {
        type: 'object',
        description: 'Workflow-scoped storage (persists during workflow run)',
        methods: {
            get: { signature: 'get(key)', description: 'Get value from storage' },
            set: { signature: 'set(key, value)', description: 'Set value in storage' },
            has: { signature: 'has(key)', description: 'Check if key exists' },
            delete: { signature: 'delete(key)', description: 'Delete key from storage' },
            clear: { signature: 'clear()', description: 'Clear all storage' },
        }
    },
};

// JavaScript keywords
const JS_KEYWORDS = [
    { label: 'const', type: 'keyword', description: 'Declare a constant variable' },
    { label: 'let', type: 'keyword', description: 'Declare a block-scoped variable' },
    { label: 'var', type: 'keyword', description: 'Declare a function-scoped variable' },
    { label: 'function', type: 'keyword', description: 'Declare a function' },
    { label: 'async', type: 'keyword', description: 'Declare async function' },
    { label: 'await', type: 'keyword', description: 'Wait for a Promise' },
    { label: 'return', type: 'keyword', description: 'Return from function' },
    { label: 'if', type: 'keyword', description: 'Conditional statement' },
    { label: 'else', type: 'keyword', description: 'Alternative branch' },
    { label: 'for', type: 'keyword', description: 'For loop' },
    { label: 'while', type: 'keyword', description: 'While loop' },
    { label: 'do', type: 'keyword', description: 'Do-while loop' },
    { label: 'switch', type: 'keyword', description: 'Switch statement' },
    { label: 'case', type: 'keyword', description: 'Switch case' },
    { label: 'break', type: 'keyword', description: 'Break from loop/switch' },
    { label: 'continue', type: 'keyword', description: 'Continue to next iteration' },
    { label: 'try', type: 'keyword', description: 'Try block' },
    { label: 'catch', type: 'keyword', description: 'Catch exception' },
    { label: 'finally', type: 'keyword', description: 'Finally block' },
    { label: 'throw', type: 'keyword', description: 'Throw an exception' },
    { label: 'new', type: 'keyword', description: 'Create new instance' },
    { label: 'class', type: 'keyword', description: 'Declare a class' },
    { label: 'extends', type: 'keyword', description: 'Extend a class' },
    { label: 'this', type: 'keyword', description: 'Current context' },
    { label: 'true', type: 'keyword', description: 'Boolean true' },
    { label: 'false', type: 'keyword', description: 'Boolean false' },
    { label: 'null', type: 'keyword', description: 'Null value' },
    { label: 'undefined', type: 'keyword', description: 'Undefined value' },
    { label: 'typeof', type: 'keyword', description: 'Get type of value' },
    { label: 'instanceof', type: 'keyword', description: 'Check instance type' },
];

// Python built-in completions
const PY_BUILTINS = {
    print: { type: 'function', signature: 'print(*args, sep=" ", end="\\n")', description: 'Print to console' },
    len: { type: 'function', signature: 'len(obj)', description: 'Get length of object' },
    range: { type: 'function', signature: 'range(start, stop?, step?)', description: 'Generate range of numbers' },
    str: { type: 'function', signature: 'str(obj)', description: 'Convert to string' },
    int: { type: 'function', signature: 'int(x, base?)', description: 'Convert to integer' },
    float: { type: 'function', signature: 'float(x)', description: 'Convert to float' },
    list: { type: 'function', signature: 'list(iterable?)', description: 'Create a list' },
    dict: { type: 'function', signature: 'dict(**kwargs)', description: 'Create a dictionary' },
    set: { type: 'function', signature: 'set(iterable?)', description: 'Create a set' },
    tuple: { type: 'function', signature: 'tuple(iterable?)', description: 'Create a tuple' },
    bool: { type: 'function', signature: 'bool(x)', description: 'Convert to boolean' },
    abs: { type: 'function', signature: 'abs(x)', description: 'Absolute value' },
    max: { type: 'function', signature: 'max(iterable)', description: 'Maximum value' },
    min: { type: 'function', signature: 'min(iterable)', description: 'Minimum value' },
    sum: { type: 'function', signature: 'sum(iterable)', description: 'Sum of values' },
    sorted: { type: 'function', signature: 'sorted(iterable, key?, reverse?)', description: 'Return sorted list' },
    reversed: { type: 'function', signature: 'reversed(seq)', description: 'Return reversed iterator' },
    enumerate: { type: 'function', signature: 'enumerate(iterable, start?)', description: 'Return enumerate object' },
    zip: { type: 'function', signature: 'zip(*iterables)', description: 'Zip iterables together' },
    map: { type: 'function', signature: 'map(func, iterable)', description: 'Apply function to iterable' },
    filter: { type: 'function', signature: 'filter(func, iterable)', description: 'Filter iterable' },
    input: { type: 'function', signature: 'input(prompt?)', description: 'Read input from user' },
    open: { type: 'function', signature: 'open(file, mode?)', description: 'Open a file' },
    type: { type: 'function', signature: 'type(obj)', description: 'Get type of object' },
    isinstance: { type: 'function', signature: 'isinstance(obj, class)', description: 'Check instance type' },
    hasattr: { type: 'function', signature: 'hasattr(obj, name)', description: 'Check if has attribute' },
    getattr: { type: 'function', signature: 'getattr(obj, name, default?)', description: 'Get attribute' },
    setattr: { type: 'function', signature: 'setattr(obj, name, value)', description: 'Set attribute' },
};

// Python keywords
const PY_KEYWORDS = [
    { label: 'def', type: 'keyword', description: 'Define a function' },
    { label: 'class', type: 'keyword', description: 'Define a class' },
    { label: 'if', type: 'keyword', description: 'Conditional statement' },
    { label: 'elif', type: 'keyword', description: 'Else if' },
    { label: 'else', type: 'keyword', description: 'Else branch' },
    { label: 'for', type: 'keyword', description: 'For loop' },
    { label: 'while', type: 'keyword', description: 'While loop' },
    { label: 'try', type: 'keyword', description: 'Try block' },
    { label: 'except', type: 'keyword', description: 'Exception handler' },
    { label: 'finally', type: 'keyword', description: 'Finally block' },
    { label: 'raise', type: 'keyword', description: 'Raise exception' },
    { label: 'return', type: 'keyword', description: 'Return from function' },
    { label: 'yield', type: 'keyword', description: 'Yield from generator' },
    { label: 'import', type: 'keyword', description: 'Import module' },
    { label: 'from', type: 'keyword', description: 'Import from module' },
    { label: 'as', type: 'keyword', description: 'Alias' },
    { label: 'with', type: 'keyword', description: 'Context manager' },
    { label: 'pass', type: 'keyword', description: 'Placeholder statement' },
    { label: 'break', type: 'keyword', description: 'Break from loop' },
    { label: 'continue', type: 'keyword', description: 'Continue to next iteration' },
    { label: 'lambda', type: 'keyword', description: 'Anonymous function' },
    { label: 'and', type: 'keyword', description: 'Logical AND' },
    { label: 'or', type: 'keyword', description: 'Logical OR' },
    { label: 'not', type: 'keyword', description: 'Logical NOT' },
    { label: 'in', type: 'keyword', description: 'Membership test' },
    { label: 'is', type: 'keyword', description: 'Identity test' },
    { label: 'True', type: 'keyword', description: 'Boolean true' },
    { label: 'False', type: 'keyword', description: 'Boolean false' },
    { label: 'None', type: 'keyword', description: 'None value' },
    { label: 'async', type: 'keyword', description: 'Async function' },
    { label: 'await', type: 'keyword', description: 'Await coroutine' },
];

/**
 * Extract words from code for word recognition
 */
function extractWords(code) {
    const words = new Set();
    const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/g;
    let match;
    while ((match = wordRegex.exec(code)) !== null) {
        words.add(match[1]);
    }
    return Array.from(words);
}

/**
 * Extract user-defined variables/functions from code
 */
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

/**
 * Get completions based on context
 */
function getCompletions(code, cursorPosition, language) {
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
                .filter(([name]) => name.toLowerCase().startsWith(partial))
                .map(([name, info]) => ({
                    label: name,
                    insertText: name,
                    type: 'method',
                    signature: info.signature,
                    description: info.description,
                    objectName
                }));
        }
        return [];
    }

    // Get the current word being typed
    const wordMatch = currentLine.match(/(\w+)$/);
    const partial = wordMatch ? wordMatch[1].toLowerCase() : '';

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
            if (info.type === 'function') {
                completions.push({
                    label: name,
                    insertText: name,
                    type: 'function',
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
        const typePriority = { keyword: 1, function: 2, method: 3, object: 4, class: 5, variable: 6, doc: 7, word: 8 };
        const aPriority = typePriority[a.type] || 10;
        const bPriority = typePriority[b.type] || 10;
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.label.localeCompare(b.label);
    });

    return completions.slice(0, 15);
}

/**
 * Get ALL completions for a language
 */
function getAllCompletions(code, language) {
    const completions = [];
    const builtins = language === 'javascript' ? JS_BUILTINS : PY_BUILTINS;
    const keywords = language === 'javascript' ? JS_KEYWORDS : PY_KEYWORDS;
    const docComments = language === 'javascript' ? JS_DOC_COMMENTS : PY_DOC_COMMENTS;

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
        if (info.type === 'function') {
            completions.push({
                label: name,
                insertText: name,
                type: 'function',
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

    // Add doc comments
    docComments.forEach(doc => {
        completions.push({
            ...doc,
            insertText: doc.insertText.replace(/\$[0-9]/g, '')
        });
    });

    // Add user-defined completions
    const userDefs = extractUserDefinitions(code, language);
    userDefs.forEach(def => {
        if (!completions.find(c => c.label === def.label)) {
            completions.push(def);
        }
    });

    // Add word recognition
    const words = extractWords(code);
    words.forEach(word => {
        if (!completions.find(c => c.label === word)) {
            completions.push({
                label: word,
                insertText: word,
                type: 'word',
                description: 'Word from code'
            });
        }
    });

    // Sort by type, then alphabetically
    const typePriority = { keyword: 1, function: 2, method: 3, object: 4, class: 5, variable: 6, doc: 7, word: 8 };
    completions.sort((a, b) => {
        const aPriority = typePriority[a.type] || 10;
        const bPriority = typePriority[b.type] || 10;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.label.localeCompare(b.label);
    });

    return completions;
}

/**
 * CodeEditor component with autocomplete
 */
function CodeEditor({ value, onChange, language, autoCompleteDelay = 50, triggerKey = 'Ctrl+Space', theme = 'dark' }) {
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);
    const completionsRef = useRef(null);
    const itemRefs = useRef([]);
    const [completions, setCompletions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [showCompletions, setShowCompletions] = useState(false);
    const [completionPos, setCompletionPos] = useState({ top: 0, left: 0 });
    const [completionSize, setCompletionSize] = useState({ width: 280, height: 200 });
    const [isResizing, setIsResizing] = useState(false);
    const [currentLine, setCurrentLine] = useState(1);
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const debounceRef = useRef(null);

    // Update current line based on cursor position
    const updateCurrentLine = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
        const lineNum = textBeforeCursor.split('\n').length;
        setCurrentLine(lineNum);
    }, []);

    // Calculate line numbers
    const lineCount = useMemo(() => {
        return (value || '').split('\n').length;
    }, [value]);

    // Parse trigger key combination
    const parsedTriggerKey = useMemo(() => {
        const parts = triggerKey.split('+');
        const key = parts.pop();
        return {
            ctrl: parts.includes('Ctrl'),
            shift: parts.includes('Shift'),
            alt: parts.includes('Alt'),
            meta: parts.includes('Meta'),
            key: key === 'Space' ? ' ' : key
        };
    }, [triggerKey]);

    // Calculate completion popup position
    const updateCompletionPosition = useCallback(() => {
        const textarea = textareaRef.current;
        const lineNumbers = lineNumbersRef.current;
        if (!textarea) return;

        const text = textarea.value;
        const cursorPos = textarea.selectionStart;

        // Get text before cursor
        const textBeforeCursor = text.substring(0, cursorPos);

        // Get computed styles for accurate line height
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 21;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 10;

        const lines = textBeforeCursor.split('\n');
        const currentLineNum = lines.length;

        // Get line numbers width for left offset
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 40;

        // Position BELOW the current line
        setCompletionPos({
            top: paddingTop + (currentLineNum * lineHeight) + 2 - textarea.scrollTop,
            left: lineNumbersWidth + 10
        });
    }, []);

    // Trigger completion (manual via keybind)
    const triggerCompletion = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        let newCompletions = getCompletions(value, cursorPos, language);

        if (newCompletions.length === 0) {
            newCompletions = getAllCompletions(value, language);
        }

        if (newCompletions.length > 0) {
            setCompletions(newCompletions);
            setSelectedIndex(0);
            setHoveredIndex(-1);
            setShowCompletions(true);
            updateCompletionPosition();
        } else {
            setShowCompletions(false);
        }
    }, [value, language, updateCompletionPosition]);

    // Handle cursor position changes
    const handleSelect = useCallback(() => {
        updateCurrentLine();
    }, [updateCurrentLine]);

    // Handle text change
    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        onChange(newValue);
        updateCurrentLine();

        // Debounce auto-completion
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const delay = Math.max(0, autoCompleteDelay);
        debounceRef.current = setTimeout(() => {
            const cursorPos = e.target.selectionStart;
            const newCompletions = getCompletions(newValue, cursorPos, language);

            if (newCompletions.length > 0) {
                setCompletions(newCompletions);
                setSelectedIndex(0);
                setHoveredIndex(-1);
                setShowCompletions(true);
                updateCompletionPosition();
            } else {
                setShowCompletions(false);
            }
        }, delay);
    }, [onChange, language, autoCompleteDelay, updateCompletionPosition]);

    // Apply completion
    const applyCompletion = useCallback((completion) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const text = value;

        // Find the word to replace
        const textBeforeCursor = text.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];

        let replaceStart = cursorPos;
        let insertText = completion.insertText;

        // Check if we're completing after a dot
        const dotMatch = currentLine.match(/(\w+)\.\s*(\w*)$/);
        if (dotMatch) {
            replaceStart = cursorPos - dotMatch[2].length;
        } else {
            // Replace the partial word
            const wordMatch = currentLine.match(/(\w+)$/);
            if (wordMatch) {
                replaceStart = cursorPos - wordMatch[1].length;
            }
        }

        const newValue = text.substring(0, replaceStart) + insertText + text.substring(cursorPos);
        onChange(newValue);

        // Set cursor position after inserted text
        const newCursorPos = replaceStart + insertText.length;
        setTimeout(() => {
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
            textarea.focus();
        }, 0);

        setShowCompletions(false);
    }, [value, onChange]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        // Check for manual trigger
        const triggerMatches = (
            e.ctrlKey === parsedTriggerKey.ctrl &&
            e.shiftKey === parsedTriggerKey.shift &&
            e.altKey === parsedTriggerKey.alt &&
            e.metaKey === parsedTriggerKey.meta &&
            e.key === parsedTriggerKey.key
        );

        if (triggerMatches) {
            e.preventDefault();
            triggerCompletion();
            return;
        }

        if (!showCompletions) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, completions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
            case 'Tab':
                if (completions[selectedIndex]) {
                    e.preventDefault();
                    applyCompletion(completions[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowCompletions(false);
                break;
            default:
                break;
        }
    }, [showCompletions, completions, selectedIndex, applyCompletion, triggerCompletion, parsedTriggerKey]);

    // Close completions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (textareaRef.current && !textareaRef.current.contains(e.target)) {
                setShowCompletions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Scroll selected item into view when navigating with arrows
    useEffect(() => {
        if (showCompletions && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex, showCompletions]);

    // Handle resize mouse events
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - resizeStartRef.current.x;
            const deltaY = e.clientY - resizeStartRef.current.y;

            let newWidth = resizeStartRef.current.width + deltaX;
            let newHeight = resizeStartRef.current.height + deltaY;

            // Minimum sizes
            const minWidth = completions.length === 1 ? 150 : 200;
            const minHeight = completions.length === 1 ? 50 : 80;

            // Maximum sizes
            const maxWidth = 600;
            const maxHeight = 400;

            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

            setCompletionSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, completions.length]);

    // Start resizing
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: completionSize.width,
            height: completionSize.height
        };
    }, [completionSize]);

    // Type icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'keyword': return '🔑';
            case 'function': return 'ƒ';
            case 'method': return '◆';
            case 'object': return '{}';
            case 'class': return '◇';
            case 'variable': return '𝑥';
            case 'doc': return 'abc';
            case 'word': return 'abc';
            default: return '•';
        }
    };

    // Type color (theme-aware)
    const getTypeColor = (type) => {
        const isDark = theme === 'dark';
        switch (type) {
            case 'keyword': return isDark ? '#c586c0' : '#af00db';
            case 'function': return isDark ? '#dcdcaa' : '#795e26';
            case 'method': return isDark ? '#dcdcaa' : '#795e26';
            case 'object': return isDark ? '#4ec9b0' : '#267f99';
            case 'class': return isDark ? '#4ec9b0' : '#267f99';
            case 'variable': return isDark ? '#9cdcfe' : '#0070c1';
            case 'doc': return isDark ? '#6a9955' : '#008000';
            case 'word': return isDark ? '#ce9178' : '#a31515';
            default: return isDark ? '#d4d4d4' : '#333333';
        }
    };

    // Theme-dependent styles
    const popupBgColor = theme === 'dark' ? '#1e1e1e' : '#f3f3f3';
    const popupBorderColor = theme === 'dark' ? '#454545' : '#c8c8c8';
    const selectedBgColor = theme === 'dark' ? '#094771' : '#d6ebff';
    const selectedBorderColor = theme === 'dark' ? '#007acc' : '#0066b8';
    const hoverBgColor = theme === 'dark' ? '#2a2d2e' : '#e8e8e8';
    const descriptionColor = theme === 'dark' ? '#969696' : '#717171';
    const signatureColor = theme === 'dark' ? '#808080' : '#6e6e6e';
    const scrollbarColor = theme === 'dark' ? '#5a5a5a' : '#c1c1c1';
    const scrollbarHoverColor = theme === 'dark' ? '#7a7a7a' : '#a1a1a1';
    const lineNumberColor = theme === 'dark' ? '#858585' : '#237893';
    const lineNumberBgColor = theme === 'dark' ? '#1e1e1e' : '#f3f3f3';
    const currentLineHighlight = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
    const currentLineNumberColor = theme === 'dark' ? '#c6c6c6' : '#0b216f';

    // Sync line numbers scroll with textarea
    const handleScroll = useCallback((e) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.target.scrollTop;
        }
    }, []);

    const lineHeight = 21;
    const paddingTop = 10;

    return (
        <div className="code-editor-wrapper" style={{ position: 'relative', display: 'flex' }}>
            {/* Line Numbers */}
            <div
                ref={lineNumbersRef}
                className="code-line-numbers"
                style={{
                    backgroundColor: lineNumberBgColor,
                    color: lineNumberColor,
                    fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
                    fontSize: '14px',
                    lineHeight: `${lineHeight}px`,
                    padding: `${paddingTop}px 8px`,
                    textAlign: 'right',
                    userSelect: 'none',
                    borderRight: `1px solid ${popupBorderColor}`,
                    overflow: 'hidden',
                    minWidth: '40px',
                    flexShrink: 0,
                }}
            >
                {Array.from({ length: lineCount }, (_, i) => {
                    const lineNum = i + 1;
                    const isCurrentLine = lineNum === currentLine;
                    return (
                        <div
                            key={lineNum}
                            style={{
                                height: `${lineHeight}px`,
                                backgroundColor: isCurrentLine ? currentLineHighlight : 'transparent',
                                color: isCurrentLine ? currentLineNumberColor : lineNumberColor,
                                paddingRight: '4px',
                                marginRight: '-8px',
                                paddingLeft: '4px',
                                marginLeft: '-8px',
                            }}
                        >
                            {lineNum}
                        </div>
                    );
                })}
            </div>

            {/* Current Line Highlight Background */}
            <div
                className="current-line-highlight"
                style={{
                    position: 'absolute',
                    left: lineNumbersRef.current ? lineNumbersRef.current.offsetWidth : 48,
                    right: 0,
                    height: `${lineHeight}px`,
                    top: `${paddingTop + (currentLine - 1) * lineHeight - (textareaRef.current?.scrollTop || 0)}px`,
                    backgroundColor: currentLineHighlight,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Code Input */}
            <textarea
                ref={textareaRef}
                className="code-input"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onSelect={handleSelect}
                onClick={handleSelect}
                onFocus={handleSelect}
                placeholder="Write code here..."
                spellCheck="false"
                autoComplete="off"
                style={{
                    flex: 1,
                    position: 'relative',
                    zIndex: 1,
                    background: 'transparent',
                    lineHeight: `${lineHeight}px`,
                    padding: `${paddingTop}px`,
                    fontSize: '14px',
                }}
            />

            {showCompletions && completions.length > 0 && (
                <div
                    ref={completionsRef}
                    className="code-completions"
                    style={{
                        position: 'absolute',
                        top: completionPos.top,
                        left: completionPos.left,
                        backgroundColor: popupBgColor,
                        border: `1px solid ${popupBorderColor}`,
                        borderRadius: '4px',
                        height: completions.length === 1 ? 'auto' : `${completionSize.height}px`,
                        width: completions.length === 1 ? 'fit-content' : `${completionSize.width}px`,
                        minWidth: completions.length === 1 ? 'fit-content' : '150px',
                        maxWidth: '600px',
                        zIndex: 10001,
                        boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Scrollable content area */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            '--scrollbar-color': scrollbarColor,
                            '--scrollbar-hover-color': scrollbarHoverColor,
                        }}
                        className="code-completions-scroll"
                    >
                        {completions.map((completion, index) => {
                            const isSelected = index === selectedIndex;
                            const isHovered = index === hoveredIndex && !isSelected;
                            let bgColor = 'transparent';
                            let borderColor = 'transparent';
                            if (isSelected) {
                                bgColor = selectedBgColor;
                                borderColor = selectedBorderColor;
                            } else if (isHovered) {
                                bgColor = hoverBgColor;
                            }
                            return (
                                <div
                                    key={`${completion.label}-${index}`}
                                    ref={el => itemRefs.current[index] = el}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        applyCompletion(completion);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                        backgroundColor: bgColor,
                                        borderLeft: `2px solid ${borderColor}`
                                    }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(-1)}
                                >
                                    <span style={{
                                        marginRight: '8px',
                                        color: getTypeColor(completion.type),
                                        fontWeight: completion.type === 'doc' || completion.type === 'word' ? 'normal' : 'bold',
                                        minWidth: completion.type === 'doc' || completion.type === 'word' ? '24px' : '16px',
                                        textAlign: 'center',
                                        fontSize: completion.type === 'doc' || completion.type === 'word' ? '10px' : '13px',
                                        fontStyle: completion.type === 'doc' || completion.type === 'word' ? 'italic' : 'normal',
                                    }}>
                                        {getTypeIcon(completion.type)}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: getTypeColor(completion.type) }}>
                                                {completion.label}
                                            </span>
                                            {completion.signature && (
                                                <span style={{ color: signatureColor, fontSize: '11px' }}>
                                                    {completion.signature}
                                                </span>
                                            )}
                                        </div>
                                        {completion.description && (
                                            <div style={{ color: descriptionColor, fontSize: '11px', marginTop: '2px' }}>
                                                {completion.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {/* Resize handle - only show when more than 1 completion, positioned outside scroll */}
                    {completions.length > 1 && (
                        <div
                            onMouseDown={handleResizeStart}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: '16px',
                                height: '16px',
                                cursor: 'se-resize',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.5,
                                borderRadius: '0 0 4px 0',
                            }}
                            title="Drag to resize"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill={theme === 'dark' ? '#888' : '#666'}>
                                <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            </svg>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CodeEditor;
