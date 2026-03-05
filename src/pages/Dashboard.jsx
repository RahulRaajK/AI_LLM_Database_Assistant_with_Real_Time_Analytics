import React, { useState, useRef } from 'react';
import TerminalPanel from '../components/TerminalPanel.jsx';
import PromptInput from '../components/PromptInput.jsx';
import ResultsTable from '../components/ResultsTable.jsx';
import ChartPanel from '../components/ChartPanel.jsx';

function Dashboard({ schema, wsConnected }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('table');

    const handleSubmit = async (prompt) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'An error occurred');
                return;
            }

            if (data.executionError) {
                setError(`SQL Execution Error: ${data.executionError}`);
            }

            setResult(data);
        } catch (e) {
            setError(`Connection error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">AI LLM Database Assistant with Real Time Analytics</h1>
                <p className="page-subtitle">
                    Natural Language → SQL powered by RAG Architecture &amp; MiniMax M2.5
                    {wsConnected && <span className="realtime-badge" style={{ marginLeft: 12 }}>● Live</span>}
                </p>
            </div>

            <div className="page-body">
                {/* Stats Row */}
                {result && (
                    <div className="stats-row fade-in">
                        <div className="stat-card">
                            <div className="stat-value">{result.resultCount}</div>
                            <div className="stat-label">Records Found</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{result.generationTime?.toFixed(2)}s</div>
                            <div className="stat-label">LLM Generation</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{result.executionTime?.toFixed(3)}s</div>
                            <div className="stat-label">SQL Execution</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{result.totalTime?.toFixed(2)}s</div>
                            <div className="stat-label">Total Time</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{result.fromCache ? '✓' : '✗'}</div>
                            <div className="stat-label">From Cache</div>
                        </div>
                    </div>
                )}

                {/* Prompt Input */}
                <PromptInput onSubmit={handleSubmit} loading={loading} />

                {/* Error Banner */}
                {error && (
                    <div className="error-banner fade-in" style={{ marginTop: 16 }}>
                        <span className="icon">⚠️</span>
                        <div>{error}</div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-spinner fade-in">
                        <div style={{ textAlign: 'center' }}>
                            <div className="spinner"></div>
                            <div className="loading-text">Analyzing prompt with RAG context...</div>
                        </div>
                    </div>
                )}

                {/* Terminal - Generated SQL */}
                {result && result.sql && (
                    <div className="fade-in" style={{ marginTop: 20 }}>
                        <TerminalPanel sql={result.sql} />
                        <div className="timing-badges">
                            <span className="timing-badge generation">🤖 Generation: {result.generationTime?.toFixed(2)}s</span>
                            <span className="timing-badge execution">⚡ Execution: {result.executionTime?.toFixed(3)}s</span>
                            <span className="timing-badge total">⏱️ Total: {result.totalTime?.toFixed(2)}s</span>
                            {result.fromCache && <span className="timing-badge cache">📦 Cached Response</span>}
                            {result.relevantTables && (
                                <span className="timing-badge generation">🗄️ Tables: {result.relevantTables.join(', ')}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {result && result.results && result.results.length > 0 && !result.results[0]?.error && (
                    <div className="card fade-in" style={{ marginTop: 20 }}>
                        <div className="card-header">
                            <span className="card-title">
                                📊 Query Results ({result.resultCount} {result.resultCount === 1 ? 'record' : 'records'})
                            </span>
                            <div className="chart-tabs">
                                {['table', 'bar', 'line', 'pie'].map((mode) => (
                                    <button
                                        key={mode}
                                        className={`chart-tab ${viewMode === mode ? 'active' : ''}`}
                                        onClick={() => setViewMode(mode)}
                                    >
                                        {mode === 'table' ? '📋 Table' : mode === 'bar' ? '📊 Bar' : mode === 'line' ? '📈 Line' : '🥧 Pie'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: viewMode !== 'table' ? 0 : undefined }}>
                            {viewMode === 'table' ? (
                                <ResultsTable data={result.results} />
                            ) : (
                                <ChartPanel data={result.results} type={viewMode} />
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!result && !loading && !error && (
                    <div className="empty-state fade-in" style={{ marginTop: 40 }}>
                        <div className="empty-state-icon">💬</div>
                        <div className="empty-state-title">Ask anything about your hospital data</div>
                        <div className="empty-state-desc">
                            Type a natural language question and the AI will generate and execute the perfect SQL query.
                            Try: "Show all patients", "List doctors by department", "Total billing amount per patient"
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
