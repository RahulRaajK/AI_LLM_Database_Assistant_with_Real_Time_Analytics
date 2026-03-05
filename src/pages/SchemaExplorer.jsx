import React, { useState, useMemo } from 'react';

function SchemaExplorer({ schema, wsConnected, updatedAt }) {
    const [search, setSearch] = useState('');
    const [expandedTables, setExpandedTables] = useState(new Set());

    const filteredSchema = useMemo(() => {
        if (!schema) return {};
        if (!search.trim()) return schema;
        const q = search.toLowerCase();
        const filtered = {};
        for (const [table, columns] of Object.entries(schema)) {
            if (table.toLowerCase().includes(q)) {
                filtered[table] = columns;
                continue;
            }
            const matchingCols = columns.filter(
                (c) =>
                    c.columnName?.toLowerCase().includes(q) ||
                    c.clCode?.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q)
            );
            if (matchingCols.length > 0) {
                filtered[table] = matchingCols;
            }
        }
        return filtered;
    }, [schema, search]);

    const toggleTable = (table) => {
        setExpandedTables((prev) => {
            const next = new Set(prev);
            if (next.has(table)) next.delete(table);
            else next.add(table);
            return next;
        });
    };

    const expandAll = () => {
        if (filteredSchema) setExpandedTables(new Set(Object.keys(filteredSchema)));
    };

    const collapseAll = () => setExpandedTables(new Set());

    if (!schema) {
        return (
            <div>
                <div className="page-header">
                    <h1 className="page-title">Schema Explorer</h1>
                </div>
                <div className="page-body">
                    <div className="loading-spinner">
                        <div style={{ textAlign: 'center' }}>
                            <div className="spinner"></div>
                            <div className="loading-text">Loading database schema...</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalTables = Object.keys(schema).length;
    const totalColumns = Object.values(schema).reduce((sum, cols) => sum + cols.length, 0);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Schema Explorer</h1>
                <p className="page-subtitle">
                    <span className="db-badge meta">🔗 hospital_metadata_db</span>
                    <span className="db-badge records">📁 hospital_records_db</span>
                    {wsConnected && (
                        <span className="realtime-badge" style={{ marginLeft: 8 }}>
                            ● Auto-Sync Active
                        </span>
                    )}
                    {updatedAt && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                            Last updated: {new Date(updatedAt).toLocaleTimeString()}
                        </span>
                    )}
                </p>
            </div>

            <div className="page-body">
                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-value">{totalTables}</div>
                        <div className="stat-label">Tables</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{totalColumns}</div>
                        <div className="stat-label">Total Columns</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">2</div>
                        <div className="stat-label">Databases</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{Object.keys(filteredSchema).length}</div>
                        <div className="stat-label">Visible Tables</div>
                    </div>
                </div>

                {/* Search + Controls */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                    <input
                        type="text"
                        className="prompt-input"
                        placeholder="Search tables, columns, or descriptions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button className="chart-tab" onClick={expandAll}>Expand All</button>
                    <button className="chart-tab" onClick={collapseAll}>Collapse All</button>
                </div>

                {/* Schema Grid */}
                <div className="schema-grid">
                    {Object.entries(filteredSchema).map(([tableName, columns]) => (
                        <div key={tableName} className="schema-table-card fade-in">
                            <div className="schema-table-header" onClick={() => toggleTable(tableName)}>
                                <span className="schema-table-name">
                                    <span>{expandedTables.has(tableName) ? '▼' : '▶'}</span>
                                    🗃️ {tableName}
                                </span>
                                <span className="schema-table-count">{columns.length} cols</span>
                            </div>
                            {expandedTables.has(tableName) && (
                                <div className="schema-columns">
                                    {columns.map((col, i) => (
                                        <div key={i}>
                                            <div className="schema-column">
                                                <span className="schema-cl-code">{col.clCode}</span>
                                                <span className="schema-col-name">
                                                    {col.columnName}
                                                    {col.isPrimaryKey && <span className="tag pk" style={{ marginLeft: 6 }}>PK</span>}
                                                    {col.isForeignKey && <span className="tag fk" style={{ marginLeft: 6 }}>FK</span>}
                                                    {col.isIndexed && <span className="tag idx" style={{ marginLeft: 6 }}>IDX</span>}
                                                </span>
                                                <span className="schema-col-type">{col.dataType}{col.maxLength !== 'N/A' ? `(${col.maxLength})` : ''}</span>
                                            </div>
                                            {col.description && (
                                                <div className="schema-col-desc">{col.description}</div>
                                            )}
                                            {col.isForeignKey && col.referencedTable && (
                                                <div className="schema-col-desc" style={{ color: 'var(--accent)' }}>
                                                    → References: {col.referencedTable}.{col.referencedColumn}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {Object.keys(filteredSchema).length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">No matching tables found</div>
                        <div className="empty-state-desc">Try adjusting your search query</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SchemaExplorer;
