import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import http from 'http';
import ragEngine from './ragEngine.js';
import ollamaClient from './ollamaClient.js';
import queryCache from './queryCache.js';

const app = express();
app.use(cors());
app.use(express.json());

const DB_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '12345',
};

// Connection pools
const metadataPool = mysql.createPool({ ...DB_CONFIG, database: 'hospital_metadata_db', waitForConnections: true, connectionLimit: 10 });
const recordsPool = mysql.createPool({ ...DB_CONFIG, database: 'hospital_records_db', waitForConnections: true, connectionLimit: 10 });

// Schema change detection
let schemaChecksum = '';
const queryHistory = [];

async function computeSchemaChecksum() {
    try {
        const [metaTables] = await metadataPool.query('SHOW TABLES');
        const [recTables] = await recordsPool.query('SHOW TABLES');
        let checksumStr = '';

        for (const t of recTables) {
            const tName = Object.values(t)[0];
            const [cols] = await recordsPool.query(`SHOW COLUMNS FROM \`${tName}\``);
            checksumStr += tName + JSON.stringify(cols);
        }
        for (const t of metaTables) {
            const tName = Object.values(t)[0];
            const [count] = await metadataPool.query(`SELECT COUNT(*) as c FROM \`${tName}\``);
            checksumStr += tName + count[0].c;
        }

        return crypto.createHash('md5').update(checksumStr).digest('hex');
    } catch (e) {
        console.error('Schema checksum error:', e.message);
        return schemaChecksum;
    }
}

// WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const wsClients = new Set();

wss.on('connection', (ws) => {
    wsClients.add(ws);
    ws.on('close', () => wsClients.delete(ws));
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const ws of wsClients) {
        if (ws.readyState === 1) ws.send(msg);
    }
}

// Polling for schema changes
setInterval(async () => {
    try {
        const newChecksum = await computeSchemaChecksum();
        if (schemaChecksum && newChecksum !== schemaChecksum) {
            console.log('Schema change detected, invalidating cache...');
            queryCache.invalidate();
            ragEngine.metadataCache = null;
            const metadata = await ragEngine.getMetadata(metadataPool);
            const schema = ragEngine.getFullSchema(metadata);
            broadcast({ type: 'schema_update', schema, timestamp: new Date().toISOString() });
        }
        schemaChecksum = newChecksum;
    } catch (e) {
        console.error('Schema poll error:', e.message);
    }
}, 5000);

// === API ROUTES ===

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await metadataPool.query('SELECT 1');
        await recordsPool.query('SELECT 1');
        const ollamaHealth = await ollamaClient.checkHealth();
        res.json({
            status: 'ok',
            databases: { metadata: 'connected', records: 'connected' },
            ollama: ollamaHealth,
            cache: queryCache.getStats(),
        });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

// Get full schema
app.get('/api/schema', async (req, res) => {
    try {
        const metadata = await ragEngine.getMetadata(metadataPool);
        const schema = ragEngine.getFullSchema(metadata);
        res.json({ schema, databases: ['hospital_metadata_db', 'hospital_records_db'] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Query history
app.get('/api/history', (req, res) => {
    res.json({ history: queryHistory.slice().reverse() });
});

// NL2SQL endpoint
app.post('/api/query', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const totalStart = Date.now();

    try {
        // 1. Check cache first
        const cached = queryCache.get(prompt);
        if (cached) {
            const historyEntry = {
                id: crypto.randomUUID(),
                prompt,
                sql: cached.sql,
                results: cached.results,
                resultCount: cached.results.length,
                generationTime: 0,
                executionTime: 0,
                totalTime: (Date.now() - totalStart) / 1000,
                fromCache: true,
                relevantTables: cached.relevantTables,
                timestamp: new Date().toISOString(),
            };
            queryHistory.push(historyEntry);
            return res.json(historyEntry);
        }

        // 2. Build RAG context
        const ragStart = Date.now();
        const { systemPrompt, relevantTables, metadataUsed } = await ragEngine.generateContext(prompt, metadataPool);
        const ragTime = (Date.now() - ragStart) / 1000;

        // 3. Call Ollama LLM
        const { rawResponse, generationTime } = await ollamaClient.generate(systemPrompt, prompt);

        // 4. Extract and validate SQL
        let sql;
        try {
            sql = ollamaClient.extractSQL(rawResponse);
        } catch (extractErr) {
            return res.status(400).json({
                error: extractErr.message,
                rawResponse,
                generationTime,
            });
        }

        // 5. Execute SQL query
        const execStart = Date.now();
        let results = [];
        let executionError = null;

        try {
            const [rows] = await recordsPool.query(sql);
            results = Array.isArray(rows) ? rows : [rows];
        } catch (sqlErr) {
            executionError = sqlErr.message;
            // Try to provide a helpful error
            results = [{ error: `SQL Execution Error: ${sqlErr.message}`, generated_sql: sql }];
        }

        const executionTime = (Date.now() - execStart) / 1000;
        const totalTime = (Date.now() - totalStart) / 1000;

        // 6. Cache the result (only if no execution error)
        if (!executionError) {
            queryCache.set(prompt, { sql, results, relevantTables });
        }

        // 7. Build response
        const historyEntry = {
            id: crypto.randomUUID(),
            prompt,
            sql,
            results,
            resultCount: results.length,
            generationTime,
            executionTime,
            ragTime,
            totalTime,
            fromCache: false,
            relevantTables,
            metadataTablesUsed: metadataUsed,
            executionError,
            timestamp: new Date().toISOString(),
        };

        queryHistory.push(historyEntry);
        res.json(historyEntry);
    } catch (e) {
        console.error('Query error:', e);
        res.status(500).json({
            error: e.message,
            prompt,
            totalTime: (Date.now() - totalStart) / 1000,
        });
    }
});

// Start server
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 AI LLM Database Assistant Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server active on ws://localhost:${PORT}`);
    console.log(`🏥 Connected to hospital_metadata_db & hospital_records_db`);
    console.log(`🤖 Using Ollama model: minimax-m2.5:cloud\n`);

    // Initial schema checksum
    computeSchemaChecksum().then((cs) => {
        schemaChecksum = cs;
        console.log(`📋 Initial schema checksum: ${cs.substring(0, 8)}...`);
    });

    // Pre-load metadata
    ragEngine.loadMetadata(metadataPool).then(() => {
        console.log('✅ Metadata cache pre-loaded');
    });
});
