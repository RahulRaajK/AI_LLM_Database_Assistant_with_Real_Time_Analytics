import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import SchemaExplorer from './pages/SchemaExplorer.jsx';
import QueryHistory from './pages/QueryHistory.jsx';

function App() {
    const [wsConnected, setWsConnected] = useState(false);
    const [schema, setSchema] = useState(null);
    const [schemaUpdatedAt, setSchemaUpdatedAt] = useState(null);
    const wsRef = useRef(null);

    const connectWebSocket = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://localhost:3001`);

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
            setWsConnected(false);
            setTimeout(connectWebSocket, 3000);
        };
        ws.onerror = () => ws.close();

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'schema_update') {
                    setSchema(data.schema);
                    setSchemaUpdatedAt(data.timestamp);
                }
            } catch (e) { /* ignore */ }
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connectWebSocket();
        // Fetch initial schema
        fetch('/api/schema')
            .then((r) => r.json())
            .then((d) => {
                setSchema(d.schema);
                setSchemaUpdatedAt(new Date().toISOString());
            })
            .catch(() => { });

        return () => wsRef.current?.close();
    }, [connectWebSocket]);

    return (
        <BrowserRouter>
            <div className="app-layout">
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <div className="sidebar-logo">
                            <div className="sidebar-logo-icon">⚡</div>
                            <div>
                                <div className="sidebar-logo-text">AI LLM Database</div>
                                <div className="sidebar-logo-sub">Real Time Analytics</div>
                            </div>
                        </div>
                    </div>
                    <nav className="sidebar-nav">
                        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="icon">🔍</span>
                            <span>Query Dashboard</span>
                        </NavLink>
                        <NavLink to="/schema" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="icon">🗄️</span>
                            <span>Schema Explorer</span>
                        </NavLink>
                        <NavLink to="/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="icon">📋</span>
                            <span>Query History</span>
                        </NavLink>
                    </nav>
                    <div className="sidebar-status">
                        <div>
                            <span className={`status-dot ${wsConnected ? 'online' : 'offline'}`}></span>
                            <span className="status-text">
                                {wsConnected ? 'Real-time Connected' : 'Reconnecting...'}
                            </span>
                        </div>
                    </div>
                </aside>

                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard schema={schema} wsConnected={wsConnected} />} />
                        <Route path="/schema" element={<SchemaExplorer schema={schema} wsConnected={wsConnected} updatedAt={schemaUpdatedAt} />} />
                        <Route path="/history" element={<QueryHistory />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
