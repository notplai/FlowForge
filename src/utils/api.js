// API utility functions with caching
const API_BASE = '/api';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class APICache {
    constructor() {
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    invalidate(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    invalidatePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

const cache = new APICache();

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Workflows API
export const workflowsAPI = {
    async getAll(useCache = true) {
        const cacheKey = 'workflows:all';

        if (useCache) {
            const cached = cache.get(cacheKey);
            if (cached) return cached;
        }

        const data = await fetchAPI('/workflows');
        cache.set(cacheKey, data);
        return data;
    },

    async getById(id) {
        return await fetchAPI(`/workflows/${id}`);
    },

    async create(workflow) {
        const data = await fetchAPI('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow)
        });
        cache.invalidatePattern('workflows');
        // Return the created workflow from the response
        return data.workflow || data;
    },

    async update(id, updates) {
        const data = await fetchAPI(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        cache.invalidatePattern('workflows');
        // Return the updated workflow from the response
        return data.workflow || data;
    },

    async delete(id) {
        await fetchAPI(`/workflows/${id}`, {
            method: 'DELETE'
        });
        cache.invalidatePattern('workflows');
    },

    async getState(id) {
        return await fetchAPI(`/workflows/${id}/state`);
    }
};

// Nodes API
export const nodesAPI = {
    async getAll(useCache = true) {
        const cacheKey = 'nodes:all';

        if (useCache) {
            const cached = cache.get(cacheKey);
            if (cached) return cached;
        }

        const data = await fetchAPI('/nodes');
        cache.set(cacheKey, data);
        return data;
    },

    async getById(id) {
        return await fetchAPI(`/nodes/${id}`);
    },

    async create(node) {
        const data = await fetchAPI('/nodes', {
            method: 'POST',
            body: JSON.stringify(node)
        });
        cache.invalidatePattern('nodes');
        return data;
    },

    async update(id, updates) {
        const data = await fetchAPI('/nodes', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates })
        });
        cache.invalidatePattern('nodes');
        return data;
    },

    async delete(id) {
        await fetchAPI(`/nodes/${id}`, {
            method: 'DELETE'
        });
        cache.invalidatePattern('nodes');
    }
};

// Settings API
export const settingsAPI = {
    async get(useCache = true) {
        const cacheKey = 'settings';

        if (useCache) {
            const cached = cache.get(cacheKey);
            if (cached) return cached;
        }

        const data = await fetchAPI('/settings');
        cache.set(cacheKey, data);
        return data;
    },

    async update(settings) {
        const data = await fetchAPI('/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        cache.invalidate('settings');
        return data;
    }
};

// Cache control
export const apiCache = {
    clear: () => cache.invalidate(),
    clearWorkflows: () => cache.invalidatePattern('workflows'),
    clearNodes: () => cache.invalidatePattern('nodes'),
    clearSettings: () => cache.invalidate('settings')
};
