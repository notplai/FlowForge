/**
 * JavaScript code completion definitions
 */

// JSDoc comment templates
export const JS_DOC_COMMENTS = [
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

// JavaScript built-in objects and functions
export const JS_BUILTINS = {
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
            trace: { signature: 'trace()', description: 'Output a stack trace' },
            count: { signature: 'count(label?)', description: 'Log the number of times called' },
            assert: { signature: 'assert(condition, ...args)', description: 'Assert a condition' },
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
            cbrt: { signature: 'cbrt(x)', description: 'Returns cube root' },
            random: { signature: 'random()', description: 'Returns random number 0-1' },
            sin: { signature: 'sin(x)', description: 'Returns sine of x' },
            cos: { signature: 'cos(x)', description: 'Returns cosine of x' },
            tan: { signature: 'tan(x)', description: 'Returns tangent of x' },
            asin: { signature: 'asin(x)', description: 'Returns arcsine of x' },
            acos: { signature: 'acos(x)', description: 'Returns arccosine of x' },
            atan: { signature: 'atan(x)', description: 'Returns arctangent of x' },
            atan2: { signature: 'atan2(y, x)', description: 'Returns arctangent of y/x' },
            log: { signature: 'log(x)', description: 'Returns natural logarithm' },
            log10: { signature: 'log10(x)', description: 'Returns base 10 logarithm' },
            log2: { signature: 'log2(x)', description: 'Returns base 2 logarithm' },
            exp: { signature: 'exp(x)', description: 'Returns e^x' },
            sign: { signature: 'sign(x)', description: 'Returns sign of x (-1, 0, 1)' },
            trunc: { signature: 'trunc(x)', description: 'Returns integer part' },
            PI: { signature: 'PI', description: 'Pi constant (~3.14159)' },
            E: { signature: 'E', description: 'Euler\'s number (~2.718)' },
            LN2: { signature: 'LN2', description: 'Natural log of 2' },
            LN10: { signature: 'LN10', description: 'Natural log of 10' },
        }
    },
    // JSON object
    JSON: {
        type: 'object',
        description: 'JSON parsing and stringifying',
        methods: {
            parse: { signature: 'parse(text, reviver?)', description: 'Parse JSON string to object' },
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
            UTC: { signature: 'UTC(year, month, ...)', description: 'Returns timestamp for UTC date' },
        }
    },
    // Object
    Object: {
        type: 'object',
        description: 'Object methods',
        methods: {
            keys: { signature: 'keys(obj)', description: 'Returns array of keys' },
            values: { signature: 'values(obj)', description: 'Returns array of values' },
            entries: { signature: 'entries(obj)', description: 'Returns array of [key, value]' },
            assign: { signature: 'assign(target, ...sources)', description: 'Copy properties to target' },
            freeze: { signature: 'freeze(obj)', description: 'Freeze an object' },
            seal: { signature: 'seal(obj)', description: 'Seal an object' },
            create: { signature: 'create(proto, props?)', description: 'Create with prototype' },
            fromEntries: { signature: 'fromEntries(iterable)', description: 'Create from entries' },
            hasOwn: { signature: 'hasOwn(obj, prop)', description: 'Check own property' },
        }
    },
    // Array
    Array: {
        type: 'object',
        description: 'Array methods',
        methods: {
            isArray: { signature: 'isArray(value)', description: 'Check if array' },
            from: { signature: 'from(arrayLike, mapFn?)', description: 'Create from iterable' },
            of: { signature: 'of(...items)', description: 'Create from arguments' },
        }
    },
    // String
    String: {
        type: 'object',
        description: 'String methods',
        methods: {
            fromCharCode: { signature: 'fromCharCode(...codes)', description: 'Create from char codes' },
            fromCodePoint: { signature: 'fromCodePoint(...points)', description: 'Create from code points' },
        }
    },
    // Number
    Number: {
        type: 'object',
        description: 'Number methods',
        methods: {
            isInteger: { signature: 'isInteger(value)', description: 'Check if integer' },
            isFinite: { signature: 'isFinite(value)', description: 'Check if finite' },
            isNaN: { signature: 'isNaN(value)', description: 'Check if NaN' },
            parseFloat: { signature: 'parseFloat(string)', description: 'Parse to float' },
            parseInt: { signature: 'parseInt(string, radix?)', description: 'Parse to integer' },
            MAX_VALUE: { signature: 'MAX_VALUE', description: 'Maximum number value' },
            MIN_VALUE: { signature: 'MIN_VALUE', description: 'Minimum positive value' },
            MAX_SAFE_INTEGER: { signature: 'MAX_SAFE_INTEGER', description: 'Max safe integer' },
            MIN_SAFE_INTEGER: { signature: 'MIN_SAFE_INTEGER', description: 'Min safe integer' },
        }
    },
    // Promise
    Promise: {
        type: 'class',
        description: 'Promise for async operations',
        methods: {
            all: { signature: 'all(iterable)', description: 'Wait for all promises' },
            allSettled: { signature: 'allSettled(iterable)', description: 'Wait for all to settle' },
            any: { signature: 'any(iterable)', description: 'First fulfilled promise' },
            race: { signature: 'race(iterable)', description: 'First settled promise' },
            resolve: { signature: 'resolve(value)', description: 'Create resolved promise' },
            reject: { signature: 'reject(reason)', description: 'Create rejected promise' },
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
    atob: { type: 'function', signature: 'atob(data)', description: 'Decode base64 string' },
    btoa: { type: 'function', signature: 'btoa(data)', description: 'Encode to base64 string' },
    fetch: { type: 'function', signature: 'fetch(url, options?)', description: 'Fetch resource from network' },
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
export const JS_KEYWORDS = [
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
    { label: 'default', type: 'keyword', description: 'Default case' },
    { label: 'break', type: 'keyword', description: 'Break from loop/switch' },
    { label: 'continue', type: 'keyword', description: 'Continue to next iteration' },
    { label: 'try', type: 'keyword', description: 'Try block' },
    { label: 'catch', type: 'keyword', description: 'Catch exception' },
    { label: 'finally', type: 'keyword', description: 'Finally block' },
    { label: 'throw', type: 'keyword', description: 'Throw an exception' },
    { label: 'new', type: 'keyword', description: 'Create new instance' },
    { label: 'class', type: 'keyword', description: 'Declare a class' },
    { label: 'extends', type: 'keyword', description: 'Extend a class' },
    { label: 'super', type: 'keyword', description: 'Call parent class' },
    { label: 'this', type: 'keyword', description: 'Current context' },
    { label: 'static', type: 'keyword', description: 'Static member' },
    { label: 'get', type: 'keyword', description: 'Getter method' },
    { label: 'set', type: 'keyword', description: 'Setter method' },
    { label: 'true', type: 'keyword', description: 'Boolean true' },
    { label: 'false', type: 'keyword', description: 'Boolean false' },
    { label: 'null', type: 'keyword', description: 'Null value' },
    { label: 'undefined', type: 'keyword', description: 'Undefined value' },
    { label: 'typeof', type: 'keyword', description: 'Get type of value' },
    { label: 'instanceof', type: 'keyword', description: 'Check instance type' },
    { label: 'in', type: 'keyword', description: 'Check property in object' },
    { label: 'of', type: 'keyword', description: 'Iterate over values' },
    { label: 'delete', type: 'keyword', description: 'Delete property' },
    { label: 'void', type: 'keyword', description: 'Void operator' },
    { label: 'import', type: 'keyword', description: 'Import module' },
    { label: 'export', type: 'keyword', description: 'Export module' },
    { label: 'from', type: 'keyword', description: 'Import from' },
    { label: 'debugger', type: 'keyword', description: 'Debugger statement' },
];

// Array instance methods for dot completion
export const JS_ARRAY_METHODS = {
    push: { signature: 'push(...items)', description: 'Add items to end' },
    pop: { signature: 'pop()', description: 'Remove last item' },
    shift: { signature: 'shift()', description: 'Remove first item' },
    unshift: { signature: 'unshift(...items)', description: 'Add items to start' },
    slice: { signature: 'slice(start?, end?)', description: 'Extract portion' },
    splice: { signature: 'splice(start, deleteCount?, ...items)', description: 'Change contents' },
    concat: { signature: 'concat(...arrays)', description: 'Merge arrays' },
    join: { signature: 'join(separator?)', description: 'Join to string' },
    reverse: { signature: 'reverse()', description: 'Reverse in place' },
    sort: { signature: 'sort(compareFn?)', description: 'Sort in place' },
    indexOf: { signature: 'indexOf(item, fromIndex?)', description: 'Find index' },
    lastIndexOf: { signature: 'lastIndexOf(item, fromIndex?)', description: 'Find last index' },
    includes: { signature: 'includes(item, fromIndex?)', description: 'Check if includes' },
    find: { signature: 'find(callback)', description: 'Find first match' },
    findIndex: { signature: 'findIndex(callback)', description: 'Find index of first match' },
    filter: { signature: 'filter(callback)', description: 'Filter items' },
    map: { signature: 'map(callback)', description: 'Transform items' },
    reduce: { signature: 'reduce(callback, initial?)', description: 'Reduce to single value' },
    reduceRight: { signature: 'reduceRight(callback, initial?)', description: 'Reduce from right' },
    forEach: { signature: 'forEach(callback)', description: 'Execute for each' },
    every: { signature: 'every(callback)', description: 'Test all items' },
    some: { signature: 'some(callback)', description: 'Test any item' },
    flat: { signature: 'flat(depth?)', description: 'Flatten nested arrays' },
    flatMap: { signature: 'flatMap(callback)', description: 'Map then flatten' },
    fill: { signature: 'fill(value, start?, end?)', description: 'Fill with value' },
    copyWithin: { signature: 'copyWithin(target, start?, end?)', description: 'Copy within array' },
    entries: { signature: 'entries()', description: 'Get entries iterator' },
    keys: { signature: 'keys()', description: 'Get keys iterator' },
    values: { signature: 'values()', description: 'Get values iterator' },
    at: { signature: 'at(index)', description: 'Get item at index' },
    toReversed: { signature: 'toReversed()', description: 'Return reversed copy' },
    toSorted: { signature: 'toSorted(compareFn?)', description: 'Return sorted copy' },
    toSpliced: { signature: 'toSpliced(start, deleteCount?, ...items)', description: 'Return spliced copy' },
    with: { signature: 'with(index, value)', description: 'Return with replaced item' },
};

// String instance methods for dot completion
export const JS_STRING_METHODS = {
    charAt: { signature: 'charAt(index)', description: 'Get character at index' },
    charCodeAt: { signature: 'charCodeAt(index)', description: 'Get char code at index' },
    codePointAt: { signature: 'codePointAt(index)', description: 'Get code point at index' },
    concat: { signature: 'concat(...strings)', description: 'Concatenate strings' },
    includes: { signature: 'includes(search, position?)', description: 'Check if includes' },
    endsWith: { signature: 'endsWith(search, length?)', description: 'Check if ends with' },
    startsWith: { signature: 'startsWith(search, position?)', description: 'Check if starts with' },
    indexOf: { signature: 'indexOf(search, position?)', description: 'Find index' },
    lastIndexOf: { signature: 'lastIndexOf(search, position?)', description: 'Find last index' },
    localeCompare: { signature: 'localeCompare(compareString)', description: 'Compare locale' },
    match: { signature: 'match(regexp)', description: 'Match against regex' },
    matchAll: { signature: 'matchAll(regexp)', description: 'Get all matches' },
    normalize: { signature: 'normalize(form?)', description: 'Unicode normalize' },
    padEnd: { signature: 'padEnd(length, padString?)', description: 'Pad at end' },
    padStart: { signature: 'padStart(length, padString?)', description: 'Pad at start' },
    repeat: { signature: 'repeat(count)', description: 'Repeat string' },
    replace: { signature: 'replace(search, replacement)', description: 'Replace first match' },
    replaceAll: { signature: 'replaceAll(search, replacement)', description: 'Replace all matches' },
    search: { signature: 'search(regexp)', description: 'Search for match' },
    slice: { signature: 'slice(start?, end?)', description: 'Extract portion' },
    split: { signature: 'split(separator, limit?)', description: 'Split into array' },
    substring: { signature: 'substring(start, end?)', description: 'Extract substring' },
    toLowerCase: { signature: 'toLowerCase()', description: 'Convert to lowercase' },
    toUpperCase: { signature: 'toUpperCase()', description: 'Convert to uppercase' },
    toLocaleLowerCase: { signature: 'toLocaleLowerCase()', description: 'Locale lowercase' },
    toLocaleUpperCase: { signature: 'toLocaleUpperCase()', description: 'Locale uppercase' },
    trim: { signature: 'trim()', description: 'Remove whitespace' },
    trimStart: { signature: 'trimStart()', description: 'Remove leading whitespace' },
    trimEnd: { signature: 'trimEnd()', description: 'Remove trailing whitespace' },
    at: { signature: 'at(index)', description: 'Get char at index' },
};
