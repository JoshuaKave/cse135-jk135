const express = require('express'); 
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;
const LOG_FILE = path.join(__dirname, 'analytics.jsonl');

app.use((req, res, next) =>{
    res.header('Access-Control-Allow-Origin', 'https://test.jk135.site'); // Change to your allowed origin(s)
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());

app.post('/collect', (req, res) => {
  const payload = req.body;

  // Validate: must have url and type at minimum
  if (!payload || !payload.url || !payload.type) {
    return res.status(400).json({ error: 'Missing required fields: url, type' });
  }

  // Add server-side timestamp (client clocks can be wrong)
  payload.serverTimestamp = new Date().toISOString();

  // Add IP address (Express provides this)
  payload.ip = req.ip;

  // Append to JSON Lines file
  const line = JSON.stringify(payload) + '\n';
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      console.error('Write error:', err);
      return res.sendStatus(500);
    }
    res.sendStatus(204); // No Content — success, nothing to return
  });
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Analytics endpoint listening on http://localhost:${PORT}`);
  console.log(`Test page: http://localhost:${PORT}/test.html`);
  console.log(`Data file: ${LOG_FILE}`);
});