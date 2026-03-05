import React, { useState, useEffect, useCallback } from 'react';
import TerminalPanel from '../components/TerminalPanel.jsx';

function QueryHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            setHistory(data.history || []);
        } catch (e) {
            console.error('Failed to fetch history:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, [fetchHistory]);

    const reRun = async (prompt) => {
        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            await res.json();
            fetchHistory();
        } catch (e) {
            console.error('Re-run failed:', e);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Query History</h1>
                <p className="page-subtitle">
                    {history.length} {history.length === 1 ? 'query' : 'queries'} recorded
                </p>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="loading-spinner">
                        <div style={{ textAlign: 'center' }}>
                            <div className="spinner"></div>
                            <div className="loading-text">Loading history...</div>
                        </div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No queries yet</div>
                        <div className="empty-state-desc">Head to the Dashboard and ask a question to get started</div>
                    </div>
                ) : (
                    <div className="history-list">
                        {history.map((item) => (
                            <div key={item.id} className="history-item fade-in">
                                <div className="history-prompt">{item.prompt}</div>
                                <div className="history-sql">{item.sql}</div>
                                <div className="history-meta">
                                    <span>📊 {item.resultCount} results</span>
                                    <span>⏱️ {item.totalTime?.toFixed(2)}s</span>
                                    <span>{item.fromCache ? '📦 Cached' : '🤖 Generated'}</span>
                                    <span>🕐 {new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button
                                        className="chart-tab"
                                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                    >
                                        {selectedItem?.id === item.id ? 'Hide Details' : 'View Details'}
                                    </button>
                                    <button className="chart-tab" onClick={() => reRun(item.prompt)}>
                                        🔄 Re-run
                                    </button>
                                    <button
                                        className="chart-tab"
                                        onClick={() => {
                                            navigator.clipboard.writeText(item.sql);
                                        }}
                                    >
                                        📋 Copy SQL
                                    </button>
                                </div>
                                {selectedItem?.id === item.id && (
                                    <div style={{ marginTop: 16 }} className="fade-in">
                                        <TerminalPanel sql={item.sql} />
                                        {item.results && item.results.length > 0 && !item.results[0]?.error && (
                                            <div className="results-table-container" style={{ marginTop: 12 }}>
                                                <table className="results-table">
                                                    <thead>
                                                        <tr>
                                                            {Object.keys(item.results[0]).map((key) => (
                                                                <th key={key}>{key}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {item.results.slice(0, 20).map((row, i) => (
                                                            <tr key={i}>
                                                                {Object.values(row).map((val, j) => (
                                                                    <td key={j}>{val !== null && val !== undefined ? String(val) : '—'}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QueryHistory;
