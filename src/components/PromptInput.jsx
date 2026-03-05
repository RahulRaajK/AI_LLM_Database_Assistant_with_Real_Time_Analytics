import React, { useState } from 'react';

function PromptInput({ onSubmit, loading }) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (prompt.trim() && !loading) {
            onSubmit(prompt.trim());
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const examples = [
        'Show all patients',
        'List doctors with their departments',
        'Total billing amount by payment method',
        'Available blood types in blood bank',
        'Upcoming appointments for this week',
    ];

    return (
        <div className="prompt-container">
            <form onSubmit={handleSubmit} className="prompt-input-wrapper">
                <input
                    type="text"
                    className="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your hospital data..."
                    disabled={loading}
                    id="prompt-input"
                    autoComplete="off"
                />
                <button type="submit" className="prompt-send-btn" disabled={loading || !prompt.trim()} id="send-btn">
                    {loading ? (
                        <>
                            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                            Analyzing...
                        </>
                    ) : (
                        <>🚀 Generate SQL</>
                    )}
                </button>
            </form>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {examples.map((ex, i) => (
                    <button
                        key={i}
                        className="chart-tab"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                            setPrompt(ex);
                            if (!loading) onSubmit(ex);
                        }}
                        disabled={loading}
                    >
                        {ex}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PromptInput;
