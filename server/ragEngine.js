class RAGEngine {
    constructor() {
        this.metadataCache = null;
        this.lastRefresh = 0;
    }

    async loadMetadata(metadataPool) {
        const [tables] = await metadataPool.query(
            "SHOW TABLES"
        );

        const tableNames = tables.map((t) => Object.values(t)[0]);
        const metadata = {};

        for (const tableName of tableNames) {
            const [rows] = await metadataPool.query(`SELECT * FROM \`${tableName}\``);
            metadata[tableName] = rows;
        }

        this.metadataCache = metadata;
        this.lastRefresh = Date.now();
        return metadata;
    }

    async getMetadata(metadataPool) {
        if (!this.metadataCache || Date.now() - this.lastRefresh > 30000) {
            await this.loadMetadata(metadataPool);
        }
        return this.metadataCache;
    }

    _identifyRelevantTables(userPrompt, metadata) {
        const promptLower = userPrompt.toLowerCase();
        const relevanceScores = {};

        const keywords = promptLower
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2);

        for (const [mapTable, rows] of Object.entries(metadata)) {
            const actualTableName = mapTable.replace('map_', '');
            let score = 0;

            // Check if actual table name appears in prompt
            if (promptLower.includes(actualTableName) || promptLower.includes(actualTableName.replace('_', ' '))) {
                score += 10;
            }

            // Check singular form
            const singular = actualTableName.endsWith('s')
                ? actualTableName.slice(0, -1)
                : actualTableName;
            if (promptLower.includes(singular)) {
                score += 8;
            }

            // Check column descriptions and names for keyword matches
            for (const row of rows) {
                const colName = (row.actual_column_name || '').toLowerCase();
                const colDesc = (row.column_description || '').toLowerCase();
                const sampleVal = (row.sample_value || '').toLowerCase();

                for (const keyword of keywords) {
                    if (colName.includes(keyword)) score += 3;
                    if (colDesc.includes(keyword)) score += 2;
                    if (sampleVal.includes(keyword)) score += 1;
                }
            }

            if (score > 0) {
                relevanceScores[mapTable] = score;
            }
        }

        // Sort by score and take top relevant tables (at least 1, at most 5)
        const sorted = Object.entries(relevanceScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // If no tables matched, return all (fallback)
        if (sorted.length === 0) {
            return Object.keys(metadata);
        }

        // Also include FK-referenced tables
        const selected = new Set(sorted.map(([t]) => t));
        for (const [table] of sorted) {
            for (const row of metadata[table]) {
                if (row.is_foreign_key === 'Yes' && row.referenced_table && row.referenced_table !== 'None') {
                    const refMapTable = `map_${row.referenced_table}`;
                    if (metadata[refMapTable]) {
                        selected.add(refMapTable);
                    }
                }
            }
        }

        return Array.from(selected);
    }

    buildSystemPrompt(metadata, relevantTables) {
        let schemaContext = '';

        for (const mapTable of relevantTables) {
            const rows = metadata[mapTable];
            if (!rows || rows.length === 0) continue;

            const actualTable = mapTable.replace('map_', '');
            schemaContext += `\n### Table: \`${actualTable}\` (in database \`hospital_records_db\`)\n`;
            schemaContext += `| CL_Code | Actual Column Name | Data Type | Description | Sample Value | Is PK | Is FK | References |\n`;
            schemaContext += `|---------|-------------------|-----------|-------------|--------------|-------|-------|------------|\n`;

            for (const row of rows) {
                const ref =
                    row.is_foreign_key === 'Yes' && row.referenced_table !== 'None'
                        ? `${row.referenced_table}.${row.referenced_column}`
                        : '-';
                schemaContext += `| ${row.cl_column_code} | ${row.actual_column_name} | ${row.data_type} | ${row.column_description} | ${row.sample_value} | ${row.is_primary_key} | ${row.is_foreign_key} | ${ref} |\n`;
            }
        }

        const systemPrompt = `You are a precise SQL query generator for a hospital management system. You MUST follow these rules EXACTLY:

CRITICAL RULES:
1. You generate SQL queries for the \`hospital_records_db\` MySQL database ONLY.  
2. The database tables use CODED column names (CL_XXXX format). You MUST use the CL_ column codes in your SQL, NOT the actual column names.
3. ONLY generate SELECT, SHOW, DESCRIBE, or EXPLAIN statements. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or any data-modifying statement.
4. Return ONLY the raw SQL query. No explanations, no markdown, no code blocks, no comments.
5. If the user asks about something that doesn't exist in the provided schema, respond with: SELECT 'ERROR: The requested data does not exist in the database schema. Available tables: ${relevantTables.map((t) => t.replace('map_', '')).join(', ')}' AS error_message;
6. Always qualify column names with table aliases when doing JOINs.
7. Use proper JOIN conditions based on foreign key relationships provided.
8. For aggregation queries, always include meaningful aliases using AS.
9. Limit results to 100 rows unless the user specifically asks for more.

DATABASE SCHEMA:
${schemaContext}

IMPORTANT MAPPING EXAMPLES:
- When user says "patient name" → use CL_ codes for first_name and last_name columns from the patients table
- When user says "doctor" → use the doctors table with appropriate CL_ codes
- Always map natural language terms to the correct CL_ coded columns using the schema above

Remember: Output ONLY the SQL query. Nothing else.`;

        return systemPrompt;
    }

    async generateContext(userPrompt, metadataPool) {
        const metadata = await this.getMetadata(metadataPool);
        const relevantTables = this._identifyRelevantTables(userPrompt, metadata);
        const systemPrompt = this.buildSystemPrompt(metadata, relevantTables);

        return {
            systemPrompt,
            relevantTables: relevantTables.map((t) => t.replace('map_', '')),
            metadataUsed: relevantTables.length,
        };
    }

    getFullSchema(metadata) {
        const schema = {};

        for (const [mapTable, rows] of Object.entries(metadata)) {
            const actualTable = mapTable.replace('map_', '');
            schema[actualTable] = rows.map((row) => ({
                clCode: row.cl_column_code,
                columnName: row.actual_column_name,
                dataType: row.data_type,
                maxLength: row.max_length,
                isPrimaryKey: row.is_primary_key === 'Yes',
                isForeignKey: row.is_foreign_key === 'Yes',
                referencedTable: row.referenced_table !== 'None' ? row.referenced_table : null,
                referencedColumn: row.referenced_column !== 'None' ? row.referenced_column : null,
                description: row.column_description,
                sampleValue: row.sample_value,
                dataCategory: row.data_category,
                isRequired: row.is_required === 'Yes',
                columnGroup: row.column_group,
                isIndexed: row.is_indexed === 'Yes',
                displayOrder: row.display_order,
            }));
        }

        return schema;
    }
}

export default new RAGEngine();
