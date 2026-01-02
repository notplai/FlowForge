// Parse and check keybind matching
export function checkKeybind(event, keybind) {
    if (!keybind) return false;

    const parts = keybind.split('+');
    const key = parts.pop().toLowerCase();
    const modifiers = parts.map(p => p.toLowerCase());

    const eventKey = event.key.toLowerCase();
    if (eventKey !== key) return false;

    const ctrl = modifiers.includes('ctrl') || modifiers.includes('control');
    const alt = modifiers.includes('alt');
    const shift = modifiers.includes('shift');
    const meta = modifiers.includes('meta') || modifiers.includes('cmd');

    return (
        ctrl === event.ctrlKey &&
        alt === event.altKey &&
        shift === event.shiftKey &&
        meta === event.metaKey
    );
}

// Create keyboard event handler with keybinds
export function createKeybindHandler(keybinds, handlers) {
    return (event) => {
        for (const [action, handler] of Object.entries(handlers)) {
            const binding = keybinds[action];
            if (binding && checkKeybind(event, binding)) {
                event.preventDefault();
                handler(event);
                return;
            }
        }
    };
}
