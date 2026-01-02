/**
 * Python code completion definitions
 */

// Python docstring comment templates
export const PY_DOC_COMMENTS = [
    { label: '""" """', insertText: '"""$0"""', type: 'doc', description: 'Single-line docstring' },
    { label: '""" ... """', insertText: '"""\n$0\n"""', type: 'doc', description: 'Multi-line docstring' },
    { label: ':param', insertText: ':param $1: $2', type: 'doc', description: 'Document a parameter' },
    { label: ':returns:', insertText: ':returns: $1', type: 'doc', description: 'Document return value' },
    { label: ':rtype:', insertText: ':rtype: $1', type: 'doc', description: 'Return type' },
    { label: ':raises:', insertText: ':raises $1: $2', type: 'doc', description: 'Document raised exception' },
    { label: ':type:', insertText: ':type $1: $2', type: 'doc', description: 'Variable type' },
    { label: ':Example:', insertText: ':Example:\n    $1', type: 'doc', description: 'Add code example' },
    { label: 'Args:', insertText: 'Args:\n    $1', type: 'doc', description: 'Google style arguments' },
    { label: 'Returns:', insertText: 'Returns:\n    $1', type: 'doc', description: 'Google style returns' },
    { label: 'Raises:', insertText: 'Raises:\n    $1', type: 'doc', description: 'Google style raises' },
    { label: 'Note:', insertText: 'Note:\n    $1', type: 'doc', description: 'Add a note' },
    { label: 'Warning:', insertText: 'Warning:\n    $1', type: 'doc', description: 'Add a warning' },
    { label: 'TODO:', insertText: 'TODO: $1', type: 'doc', description: 'Add TODO comment' },
];

// Python built-in functions
export const PY_BUILTINS = {
    // I/O functions
    print: { type: 'function', signature: 'print(*args, sep=" ", end="\\n", file=None)', description: 'Print to console' },
    input: { type: 'function', signature: 'input(prompt="")', description: 'Read input from user' },
    open: { type: 'function', signature: 'open(file, mode="r", encoding=None)', description: 'Open a file' },

    // Type conversion
    str: { type: 'function', signature: 'str(obj="")', description: 'Convert to string' },
    int: { type: 'function', signature: 'int(x=0, base=10)', description: 'Convert to integer' },
    float: { type: 'function', signature: 'float(x=0)', description: 'Convert to float' },
    bool: { type: 'function', signature: 'bool(x=False)', description: 'Convert to boolean' },
    bytes: { type: 'function', signature: 'bytes(source, encoding)', description: 'Convert to bytes' },
    bytearray: { type: 'function', signature: 'bytearray(source, encoding)', description: 'Create bytearray' },
    complex: { type: 'function', signature: 'complex(real=0, imag=0)', description: 'Create complex number' },

    // Collection creation
    list: { type: 'function', signature: 'list(iterable=[])', description: 'Create a list' },
    dict: { type: 'function', signature: 'dict(**kwargs)', description: 'Create a dictionary' },
    set: { type: 'function', signature: 'set(iterable=[])', description: 'Create a set' },
    frozenset: { type: 'function', signature: 'frozenset(iterable=[])', description: 'Create immutable set' },
    tuple: { type: 'function', signature: 'tuple(iterable=())', description: 'Create a tuple' },

    // Sequence operations
    len: { type: 'function', signature: 'len(obj)', description: 'Get length of object' },
    range: { type: 'function', signature: 'range(start, stop=None, step=1)', description: 'Generate range of numbers' },
    sorted: { type: 'function', signature: 'sorted(iterable, key=None, reverse=False)', description: 'Return sorted list' },
    reversed: { type: 'function', signature: 'reversed(seq)', description: 'Return reversed iterator' },
    enumerate: { type: 'function', signature: 'enumerate(iterable, start=0)', description: 'Return enumerate object' },
    zip: { type: 'function', signature: 'zip(*iterables)', description: 'Zip iterables together' },
    map: { type: 'function', signature: 'map(func, iterable, ...)', description: 'Apply function to iterable' },
    filter: { type: 'function', signature: 'filter(func, iterable)', description: 'Filter iterable' },
    slice: { type: 'function', signature: 'slice(start, stop=None, step=None)', description: 'Create slice object' },
    iter: { type: 'function', signature: 'iter(obj, sentinel=None)', description: 'Get iterator' },
    next: { type: 'function', signature: 'next(iterator, default)', description: 'Get next item' },

    // Math operations
    abs: { type: 'function', signature: 'abs(x)', description: 'Absolute value' },
    max: { type: 'function', signature: 'max(iterable, key=None, default=None)', description: 'Maximum value' },
    min: { type: 'function', signature: 'min(iterable, key=None, default=None)', description: 'Minimum value' },
    sum: { type: 'function', signature: 'sum(iterable, start=0)', description: 'Sum of values' },
    pow: { type: 'function', signature: 'pow(base, exp, mod=None)', description: 'Power operation' },
    round: { type: 'function', signature: 'round(number, ndigits=None)', description: 'Round number' },
    divmod: { type: 'function', signature: 'divmod(a, b)', description: 'Quotient and remainder' },

    // Type checking
    type: { type: 'function', signature: 'type(obj)', description: 'Get type of object' },
    isinstance: { type: 'function', signature: 'isinstance(obj, classinfo)', description: 'Check instance type' },
    issubclass: { type: 'function', signature: 'issubclass(cls, classinfo)', description: 'Check subclass' },
    callable: { type: 'function', signature: 'callable(obj)', description: 'Check if callable' },

    // Attribute operations
    hasattr: { type: 'function', signature: 'hasattr(obj, name)', description: 'Check if has attribute' },
    getattr: { type: 'function', signature: 'getattr(obj, name, default=None)', description: 'Get attribute' },
    setattr: { type: 'function', signature: 'setattr(obj, name, value)', description: 'Set attribute' },
    delattr: { type: 'function', signature: 'delattr(obj, name)', description: 'Delete attribute' },
    dir: { type: 'function', signature: 'dir(obj=None)', description: 'List attributes' },
    vars: { type: 'function', signature: 'vars(obj=None)', description: 'Return __dict__' },

    // Object creation
    object: { type: 'class', signature: 'object()', description: 'Base object class' },
    property: { type: 'function', signature: 'property(fget, fset, fdel, doc)', description: 'Create property' },
    classmethod: { type: 'function', signature: '@classmethod', description: 'Class method decorator' },
    staticmethod: { type: 'function', signature: '@staticmethod', description: 'Static method decorator' },
    super: { type: 'function', signature: 'super(type, obj=None)', description: 'Access parent class' },

    // String operations
    chr: { type: 'function', signature: 'chr(i)', description: 'Character from code point' },
    ord: { type: 'function', signature: 'ord(c)', description: 'Code point from character' },
    repr: { type: 'function', signature: 'repr(obj)', description: 'String representation' },
    ascii: { type: 'function', signature: 'ascii(obj)', description: 'ASCII representation' },
    format: { type: 'function', signature: 'format(value, format_spec="")', description: 'Format value' },

    // Binary operations
    bin: { type: 'function', signature: 'bin(x)', description: 'Binary representation' },
    oct: { type: 'function', signature: 'oct(x)', description: 'Octal representation' },
    hex: { type: 'function', signature: 'hex(x)', description: 'Hexadecimal representation' },

    // Logical operations
    all: { type: 'function', signature: 'all(iterable)', description: 'All items truthy' },
    any: { type: 'function', signature: 'any(iterable)', description: 'Any item truthy' },

    // Other
    id: { type: 'function', signature: 'id(obj)', description: 'Get object identity' },
    hash: { type: 'function', signature: 'hash(obj)', description: 'Get hash value' },
    help: { type: 'function', signature: 'help(obj=None)', description: 'Get help' },
    globals: { type: 'function', signature: 'globals()', description: 'Get global namespace' },
    locals: { type: 'function', signature: 'locals()', description: 'Get local namespace' },
    eval: { type: 'function', signature: 'eval(expression, globals, locals)', description: 'Evaluate expression' },
    exec: { type: 'function', signature: 'exec(code, globals, locals)', description: 'Execute code' },
    compile: { type: 'function', signature: 'compile(source, filename, mode)', description: 'Compile source' },
    __import__: { type: 'function', signature: '__import__(name)', description: 'Import module' },
    breakpoint: { type: 'function', signature: 'breakpoint()', description: 'Enter debugger' },

    // Exception types
    Exception: { type: 'class', signature: 'Exception(msg="")', description: 'Base exception class' },
    ValueError: { type: 'class', signature: 'ValueError(msg="")', description: 'Value error exception' },
    TypeError: { type: 'class', signature: 'TypeError(msg="")', description: 'Type error exception' },
    KeyError: { type: 'class', signature: 'KeyError(msg="")', description: 'Key error exception' },
    IndexError: { type: 'class', signature: 'IndexError(msg="")', description: 'Index error exception' },
    AttributeError: { type: 'class', signature: 'AttributeError(msg="")', description: 'Attribute error' },
    RuntimeError: { type: 'class', signature: 'RuntimeError(msg="")', description: 'Runtime error' },
    StopIteration: { type: 'class', signature: 'StopIteration()', description: 'Stop iteration' },
    FileNotFoundError: { type: 'class', signature: 'FileNotFoundError(msg="")', description: 'File not found' },
    IOError: { type: 'class', signature: 'IOError(msg="")', description: 'I/O error' },
    ImportError: { type: 'class', signature: 'ImportError(msg="")', description: 'Import error' },
    NameError: { type: 'class', signature: 'NameError(msg="")', description: 'Name error' },
    ZeroDivisionError: { type: 'class', signature: 'ZeroDivisionError(msg="")', description: 'Division by zero' },
};

// Python keywords
export const PY_KEYWORDS = [
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
    { label: 'global', type: 'keyword', description: 'Global variable' },
    { label: 'nonlocal', type: 'keyword', description: 'Nonlocal variable' },
    { label: 'del', type: 'keyword', description: 'Delete variable' },
    { label: 'assert', type: 'keyword', description: 'Assert statement' },
    { label: 'match', type: 'keyword', description: 'Pattern matching (3.10+)' },
    { label: 'case', type: 'keyword', description: 'Match case (3.10+)' },
];

// Common Python module completions
export const PY_MODULES = {
    os: {
        type: 'module',
        description: 'Operating system interfaces',
        methods: {
            getcwd: { signature: 'getcwd()', description: 'Get current working directory' },
            chdir: { signature: 'chdir(path)', description: 'Change directory' },
            listdir: { signature: 'listdir(path=".")', description: 'List directory contents' },
            mkdir: { signature: 'mkdir(path, mode=0o777)', description: 'Create directory' },
            makedirs: { signature: 'makedirs(path, mode=0o777)', description: 'Create directories' },
            remove: { signature: 'remove(path)', description: 'Remove file' },
            rmdir: { signature: 'rmdir(path)', description: 'Remove directory' },
            rename: { signature: 'rename(src, dst)', description: 'Rename file/directory' },
            path: { signature: 'path', description: 'Path manipulation module' },
            environ: { signature: 'environ', description: 'Environment variables' },
            getenv: { signature: 'getenv(key, default=None)', description: 'Get environment variable' },
        }
    },
    sys: {
        type: 'module',
        description: 'System-specific parameters',
        methods: {
            argv: { signature: 'argv', description: 'Command line arguments' },
            exit: { signature: 'exit(code=0)', description: 'Exit program' },
            path: { signature: 'path', description: 'Module search path' },
            version: { signature: 'version', description: 'Python version string' },
            platform: { signature: 'platform', description: 'Platform identifier' },
            stdin: { signature: 'stdin', description: 'Standard input' },
            stdout: { signature: 'stdout', description: 'Standard output' },
            stderr: { signature: 'stderr', description: 'Standard error' },
        }
    },
    json: {
        type: 'module',
        description: 'JSON encoder/decoder',
        methods: {
            loads: { signature: 'loads(s)', description: 'Parse JSON string' },
            dumps: { signature: 'dumps(obj, indent=None)', description: 'Convert to JSON string' },
            load: { signature: 'load(fp)', description: 'Load JSON from file' },
            dump: { signature: 'dump(obj, fp, indent=None)', description: 'Write JSON to file' },
        }
    },
    re: {
        type: 'module',
        description: 'Regular expressions',
        methods: {
            match: { signature: 'match(pattern, string)', description: 'Match at beginning' },
            search: { signature: 'search(pattern, string)', description: 'Search for pattern' },
            findall: { signature: 'findall(pattern, string)', description: 'Find all matches' },
            finditer: { signature: 'finditer(pattern, string)', description: 'Find all as iterator' },
            sub: { signature: 'sub(pattern, repl, string)', description: 'Replace pattern' },
            split: { signature: 'split(pattern, string)', description: 'Split by pattern' },
            compile: { signature: 'compile(pattern)', description: 'Compile pattern' },
        }
    },
    math: {
        type: 'module',
        description: 'Mathematical functions',
        methods: {
            sqrt: { signature: 'sqrt(x)', description: 'Square root' },
            pow: { signature: 'pow(x, y)', description: 'Power function' },
            floor: { signature: 'floor(x)', description: 'Floor function' },
            ceil: { signature: 'ceil(x)', description: 'Ceiling function' },
            sin: { signature: 'sin(x)', description: 'Sine function' },
            cos: { signature: 'cos(x)', description: 'Cosine function' },
            tan: { signature: 'tan(x)', description: 'Tangent function' },
            log: { signature: 'log(x, base=e)', description: 'Logarithm' },
            exp: { signature: 'exp(x)', description: 'Exponential' },
            pi: { signature: 'pi', description: 'Pi constant' },
            e: { signature: 'e', description: 'Euler\'s number' },
        }
    },
    random: {
        type: 'module',
        description: 'Random number generation',
        methods: {
            random: { signature: 'random()', description: 'Random float 0-1' },
            randint: { signature: 'randint(a, b)', description: 'Random integer a-b' },
            choice: { signature: 'choice(seq)', description: 'Random element' },
            choices: { signature: 'choices(seq, k=1)', description: 'Random elements with replacement' },
            sample: { signature: 'sample(seq, k)', description: 'Random elements without replacement' },
            shuffle: { signature: 'shuffle(seq)', description: 'Shuffle in place' },
            uniform: { signature: 'uniform(a, b)', description: 'Random float a-b' },
        }
    },
    datetime: {
        type: 'module',
        description: 'Date and time handling',
        methods: {
            datetime: { signature: 'datetime(year, month, day, ...)', description: 'Datetime class' },
            date: { signature: 'date(year, month, day)', description: 'Date class' },
            time: { signature: 'time(hour, minute, second)', description: 'Time class' },
            timedelta: { signature: 'timedelta(days, seconds, ...)', description: 'Time difference' },
        }
    },
};

// List instance methods for dot completion
export const PY_LIST_METHODS = {
    append: { signature: 'append(item)', description: 'Add item to end' },
    extend: { signature: 'extend(iterable)', description: 'Extend with iterable' },
    insert: { signature: 'insert(index, item)', description: 'Insert at index' },
    remove: { signature: 'remove(item)', description: 'Remove first occurrence' },
    pop: { signature: 'pop(index=-1)', description: 'Remove and return item' },
    clear: { signature: 'clear()', description: 'Remove all items' },
    index: { signature: 'index(item, start=0, end=-1)', description: 'Find index of item' },
    count: { signature: 'count(item)', description: 'Count occurrences' },
    sort: { signature: 'sort(key=None, reverse=False)', description: 'Sort in place' },
    reverse: { signature: 'reverse()', description: 'Reverse in place' },
    copy: { signature: 'copy()', description: 'Shallow copy' },
};

// String instance methods for dot completion
export const PY_STRING_METHODS = {
    capitalize: { signature: 'capitalize()', description: 'Capitalize first char' },
    casefold: { signature: 'casefold()', description: 'Case-insensitive lowercase' },
    center: { signature: 'center(width, fillchar=" ")', description: 'Center in width' },
    count: { signature: 'count(sub, start=0, end=-1)', description: 'Count occurrences' },
    encode: { signature: 'encode(encoding="utf-8")', description: 'Encode to bytes' },
    endswith: { signature: 'endswith(suffix)', description: 'Check suffix' },
    startswith: { signature: 'startswith(prefix)', description: 'Check prefix' },
    find: { signature: 'find(sub, start=0, end=-1)', description: 'Find substring' },
    rfind: { signature: 'rfind(sub, start=0, end=-1)', description: 'Find from right' },
    format: { signature: 'format(*args, **kwargs)', description: 'Format string' },
    index: { signature: 'index(sub, start=0, end=-1)', description: 'Find or raise' },
    isalnum: { signature: 'isalnum()', description: 'Is alphanumeric' },
    isalpha: { signature: 'isalpha()', description: 'Is alphabetic' },
    isdigit: { signature: 'isdigit()', description: 'Is digit' },
    islower: { signature: 'islower()', description: 'Is lowercase' },
    isupper: { signature: 'isupper()', description: 'Is uppercase' },
    isspace: { signature: 'isspace()', description: 'Is whitespace' },
    join: { signature: 'join(iterable)', description: 'Join with separator' },
    lower: { signature: 'lower()', description: 'Convert to lowercase' },
    upper: { signature: 'upper()', description: 'Convert to uppercase' },
    strip: { signature: 'strip(chars=None)', description: 'Strip whitespace' },
    lstrip: { signature: 'lstrip(chars=None)', description: 'Strip left' },
    rstrip: { signature: 'rstrip(chars=None)', description: 'Strip right' },
    replace: { signature: 'replace(old, new, count=-1)', description: 'Replace substring' },
    split: { signature: 'split(sep=None, maxsplit=-1)', description: 'Split string' },
    rsplit: { signature: 'rsplit(sep=None, maxsplit=-1)', description: 'Split from right' },
    splitlines: { signature: 'splitlines(keepends=False)', description: 'Split by lines' },
    title: { signature: 'title()', description: 'Title case' },
    zfill: { signature: 'zfill(width)', description: 'Zero-fill' },
};

// Dict instance methods for dot completion
export const PY_DICT_METHODS = {
    get: { signature: 'get(key, default=None)', description: 'Get value' },
    keys: { signature: 'keys()', description: 'Get keys view' },
    values: { signature: 'values()', description: 'Get values view' },
    items: { signature: 'items()', description: 'Get items view' },
    pop: { signature: 'pop(key, default)', description: 'Remove and return' },
    popitem: { signature: 'popitem()', description: 'Remove last item' },
    setdefault: { signature: 'setdefault(key, default=None)', description: 'Set if missing' },
    update: { signature: 'update(other)', description: 'Update from dict' },
    clear: { signature: 'clear()', description: 'Remove all items' },
    copy: { signature: 'copy()', description: 'Shallow copy' },
    fromkeys: { signature: 'fromkeys(keys, value=None)', description: 'Create from keys' },
};
