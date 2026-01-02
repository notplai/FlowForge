/**
 * Code completions index
 * Re-exports all completion definitions from language-specific modules
 */

// JavaScript completions
export {
    JS_DOC_COMMENTS,
    JS_BUILTINS,
    JS_KEYWORDS,
    JS_ARRAY_METHODS,
    JS_STRING_METHODS,
} from './javascript.js';

// Python completions
export {
    PY_DOC_COMMENTS,
    PY_BUILTINS,
    PY_KEYWORDS,
    PY_MODULES,
    PY_LIST_METHODS,
    PY_STRING_METHODS,
    PY_DICT_METHODS,
} from './python.js';

/**
 * Type icons mapping for completion popup
 */
export const TYPE_ICONS = {
    keyword: '🔑',      // Key for keywords
    function: 'ƒ',      // Function symbol
    method: '⚙',       // Gear for methods
    object: '{}',        // Circle for objects
    class: '◆',         // Diamond for classes
    variable: '𝑥',      // Variable x
    doc: '📝',          // Document for docs
    word: '📄',         // Page for word
    module: '📦',       // Package for modules
    property: '□',      // Square for properties
    constant: '𝐶',      // C for constants
    snippet: '⟨⟩',      // Brackets for snippets
    default: '•',       // Bullet for default
};

/**
 * Type colors mapping (dark/light theme)
 */
export const TYPE_COLORS = {
    dark: {
        keyword: '#c586c0',
        function: '#dcdcaa',
        method: '#dcdcaa',
        object: '#4ec9b0',
        class: '#4ec9b0',
        variable: '#9cdcfe',
        doc: '#6a9955',
        word: '#ce9178',
        module: '#4fc1ff',
        property: '#9cdcfe',
        constant: '#4fc1ff',
        snippet: '#d7ba7d',
        default: '#d4d4d4',
    },
    light: {
        keyword: '#af00db',
        function: '#795e26',
        method: '#795e26',
        object: '#267f99',
        class: '#267f99',
        variable: '#0070c1',
        doc: '#008000',
        word: '#a31515',
        module: '#0000ff',
        property: '#0070c1',
        constant: '#0000ff',
        snippet: '#811f3f',
        default: '#333333',
    }
};
