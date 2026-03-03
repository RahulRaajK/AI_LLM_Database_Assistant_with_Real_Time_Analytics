class OllamaClient {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = 'minimax-m2.5:cloud';
    }

    async generate(systemPrompt, userPrompt) {
        const startTime = Date.now();

        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: userPrompt,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: 0,
                    top_p: 0.1,
                    num_predict: 1024,
                },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama API error (${response.status}): ${text}`);
        }

        const data = await response.json();
        const generationTime = (Date.now() - startTime) / 1000;

        return {
            rawResponse: data.response,
            generationTime,
            model: this.model,
        };
    }

    extractSQL(rawResponse) {
        let sql = rawResponse.trim();

        // Remove markdown code blocks
        const codeBlockMatch = sql.match(/```(?:sql)?\s*\n?([\s\S]*?)```/i);
        if (codeBlockMatch) {
            sql = codeBlockMatch[1].trim();
        }

        // Remove leading comments or explanations before SQL
        const sqlStart = sql.search(/\b(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/i);
        if (sqlStart > 0) {
            sql = sql.substring(sqlStart);
        }

        // Remove trailing text after the semicolon
        const semicolonIdx = sql.lastIndexOf(';');
        if (semicolonIdx !== -1) {
            sql = sql.substring(0, semicolonIdx + 1);
        } else {
            sql = sql + ';';
        }

        // Safety: deny non-SELECT statements
        const firstKeyword = sql.trim().split(/\s+/)[0].toUpperCase();
        const allowed = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
        if (!allowed.includes(firstKeyword)) {
            throw new Error(
                `Safety Error: Only SELECT/SHOW/DESCRIBE/EXPLAIN queries are allowed. Got: ${firstKeyword}`
            );
        }

        return sql;
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return { healthy: false, error: 'Ollama not responding' };
            const data = await response.json();
            const hasModel = data.models?.some((m) => m.name.includes('minimax-m2.5'));
            return { healthy: true, modelAvailable: hasModel };
        } catch (e) {
            return { healthy: false, error: e.message };
        }
    }
}

export default new OllamaClient();
