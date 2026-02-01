const express = require('express');
const { escapeHTML } = require('../lib/common');

const router = express.Router();

router.all('/echo-nodejs', (req, res) => {
  const method = req.method;
  const protocol = req.protocol.toUpperCase() + '/' + req.httpVersion;
  const contentType = req.get('content-type') || '';
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NodeJS Echo</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
<section>
  <h1>NodeJS Echo Response</h1>
  <h2>Request Information</h2>
  <p><strong>HTTP Protocol:</strong> ${escapeHTML(protocol)}</p>
  <p><strong>HTTP Method:</strong> ${escapeHTML(method)}</p>
  <p><strong>Content-Type:</strong> ${escapeHTML(contentType)}</p>`;

  if (method === 'GET') {
    html += '  <h2>Query Parameters</h2>';
    const params = req.query;
    if (Object.keys(params).length > 0) {
      html += '  <ul>';
      for (const [key, value] of Object.entries(params)) {
        html += `    <li><strong>${escapeHTML(key)}:</strong> ${escapeHTML(value)}</li>`;
      }
      html += '  </ul>';
    } else {
      html += '  <p>No query parameters received.</p>';
    }
  } else {
    // Handle POST, PUT, DELETE
    const data = req.body;
    
    if (contentType.includes('application/json')) {
      html += '  <h2>JSON Body</h2>';
    } else {
      html += '  <h2>Form Data</h2>';
    }
    
    if (data && Object.keys(data).length > 0) {
      html += '  <ul>';
      for (const [key, value] of Object.entries(data)) {
        html += `    <li><strong>${escapeHTML(key)}:</strong> ${escapeHTML(String(value))}</li>`;
      }
      html += '  </ul>';
    } else {
      html += '  <p>No data received.</p>';
    }
  }

  html += `  <p><a href="../forms/echo_form.html">Back to Form</a></p>
</section>
</body>
</html>`;

  res.type('html').send(html);
});

module.exports = router;