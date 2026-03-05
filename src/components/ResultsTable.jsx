import React from 'react';

function ResultsTable({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No results</div>
            </div>
        );
    }

    const columns = Object.keys(data[0]);

    return (
        <div className="results-table-container">
            <table className="results-table" id="results-table">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>#</th>
                        {columns.map((col) => (
                            <th key={col}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                            {columns.map((col) => (
                                <td key={col} title={row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}>
                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ResultsTable;
