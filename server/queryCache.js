import crypto from 'crypto';

class QueryCache {
    constructor() {
        this.cache = new Map();
        this.schemaVersion = 0;
    }

    _normalizePrompt(prompt) {
        return prompt.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    _hashPrompt(prompt) {
        const normalized = this._normalizePrompt(prompt);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    get(prompt) {
        const hash = this._hashPrompt(prompt);
        const entry = this.cache.get(hash);
        if (entry && entry.schemaVersion === this.schemaVersion) {
            return entry;
        }
        if (entry && entry.schemaVersion !== this.schemaVersion) {
            this.cache.delete(hash);
        }
        return null;
    }

    set(prompt, data) {
        const hash = this._hashPrompt(prompt);
        this.cache.set(hash, {
            ...data,
            schemaVersion: this.schemaVersion,
            cachedAt: new Date().toISOString(),
        });
    }

    invalidate() {
        this.schemaVersion++;
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            schemaVersion: this.schemaVersion,
        };
    }
}

export default new QueryCache();
