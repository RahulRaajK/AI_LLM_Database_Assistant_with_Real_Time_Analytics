# AI LLM Database Assistant with Real Time Analytics

A full-stack NLP2SQL application using RAG architecture. The system translates natural language queries into safe, executable SQL queries by analyzing `hospital_metadata_db` (which maps coded columns to human-readable names), generating queries using the local **Ollama** `minimax-m2.5:cloud` model, and executing them against `hospital_records_db`.

It features real-time schema change detection, deterministic query caching, and a premium React frontend with dynamic data visualizations.

## Prerequisites

Before running the project, ensure you have the following installed:
1. **Node.js** (v18 or higher)
2. **MySQL Server** (Running on port 3306)
3. **Ollama** (Local LLM runner)

## 1. Database Setup

The project requires two MySQL databases:
1. `hospital_metadata_db`: Contains mapping tables with column descriptions and metadata.
2. `hospital_records_db`: Contains actual hospital data with coded column names (e.g., `CL_1415`).

Make sure both databases are created, populated, and running locally. Update your credentials in `server/server.js` if necessary:
```javascript
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '12345', // Change this to your MySQL password
};
```

## 2. Ollama & LLM Setup

The application relies on the `minimax-m2.5:cloud` model running locally. First, verify Ollama is running, then pull the required model:

```bash
ollama pull minimax-m2.5:cloud
```

## 3. Installation

Clone the repository and install the Node.js dependencies:

```bash
git clone https://github.com/RahulRaajK/AI_LLM_Database_Assistant_with_Real_Time_Analytics.git
cd AI_LLM_Database_Assistant_with_Real_Time_Analytics
npm install
```

## 4. Running the Application

This project uses `concurrently` to run both the Express API server and the Vite React frontend simultaneously.

Run the predefined start script from the root of the project:

```bash
npm start
```

Alternatively, you can run them in separate terminal windows:
- **Terminal 1 (Backend):** `npm run server` (compiles and starts on port 3001)
- **Terminal 2 (Frontend):** `npm run dev` (compiles and starts Vite on port 5173)

## 5. Usage

1. Open your browser and navigate to the frontend URL (usually `http://localhost:5173`).
2. Use the **Query Dashboard** to enter natural language prompts (e.g., "Show me the top 5 patients").
3. View the generated SQL query in the terminal UI and analyze the resulting tables and charts.
4. Open the **Schema Explorer** to view the database structure. Any changes made to the database schemas externally (like in MySQL Workbench) will automatically sync to the UI via WebSockets.
5. Review the **Query History** to view or re-run past queries.

## Architecture

- **Backend**: Express.js, `mysql2` connection pools, WebSocket for schema polling, SHA-256 query caching, Custom RAG Engine mapping logic.
- **Frontend**: React, Vite, Chart.js, React Router, custom premium CSS mapping.
- **AI**: Local Ollama instance running `minimax-m2.5:cloud` with strict prompt constraints (SELECT-only output).
