import React, { useState } from 'react';

function TerminalPanel({ sql }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = sql;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const highlightSQL = (sqlStr) => {
        if (!sqlStr) return '';
        const keywords = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|JOIN|INNER|LEFT|RIGHT|OUTER|CROSS|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|IS|NULL|EXISTS|UNION|ALL|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|SET|INTO|VALUES|DESC|ASC|SHOW|DESCRIBE|EXPLAIN|DATABASE|USE)\b/gi;
        const strings = /('[^']*')/g;
        const numbers = /\b(\d+(\.\d+)?)\b/g;
        const functions = /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|IFNULL|CONCAT|DATE|NOW|YEAR|MONTH|DAY|UPPER|LOWER|TRIM|CAST|CONVERT|ROUND|CEIL|FLOOR)\b(?=\s*\()/gi;

        let result = sqlStr;
        result = result.replace(strings, '<span class="sql-string">$1</span>');
        result = result.replace(functions, '<span class="sql-function">$1</span>');
        result = result.replace(keywords, '<span class="sql-keyword">$1</span>');
        result = result.replace(/(?<!<[^>]*)\b(\d+(\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

        return result;
    };

    return (
        <div className="terminal">
            <div className="terminal-header">
                <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                </div>
                <div className="terminal-title">Generated SQL Query — hospital_records_db</div>
                <div className="terminal-actions">
                    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                        {copied ? '✓ Copied!' : '📋 Copy Code'}
                    </button>
                </div>
            </div>
            <div
                className="terminal-body"
                dangerouslySetInnerHTML={{
                    __html: `<span class="sql-operator">mysql&gt;</span> ${highlightSQL(sql)}`,
                }}
            />
        </div>
    );
}

export default TerminalPanel;
