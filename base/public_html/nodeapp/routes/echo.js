const express = require('express');
const { escapeHTML } = require('../lib/common');

const router = express.Router();

router.all('/echo-nodejs', (req, res) => {
    const method = req.method;
    const protocol = req.protocol.toUpperCase() + '/' + req.httpVersion;
    const contentType = req.get('content-type') || 'Not specified';
    const hostname = req.hostname || 'Not specified';
    const dateTime = new Date().toString();
    const userAgent = req.get('user-agent') || 'Not specified';
    const ipAddress =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'Not specified';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NodeJS Echo</title>
    <link rel="stylesheet" href="../styles.css">
    <style>
        pre { background-color: #f5f5f5; padding: 1rem; border-radius: 0.25rem; overflow-x: auto; }
    </style>
</head>
<body>
<section>
    <h1>NodeJS Echo Response</h1>
    <h2>Request Information</h2>
    <p><strong>HTTP Protocol:</strong> ${escapeHTML(protocol)}</p>
    <p><strong>HTTP Method:</strong> ${escapeHTML(method)}</p>
    <p><strong>Content-Type:</strong> ${escapeHTML(contentType)}</p>
    <p><strong>Hostname:</strong> ${escapeHTML(hostname)}</p>
    <p><strong>Date/Time:</strong> ${escapeHTML(dateTime)}</p>
    <p><strong>User-Agent:</strong> ${escapeHTML(userAgent)}</p>
    <p><strong>IP Address:</strong> ${escapeHTML(ipAddress)}</p>`;

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
        const isJson = contentType.includes('application/json');
        
        if (isJson) {
            html += '  <h2>JSON Body</h2>';
        } else {
            html += '  <h2>Form Data</h2>';
        }
        
        if (data && Object.keys(data).length > 0) {
            if (isJson) {
                const formattedJson = JSON.stringify(data, null, 2);
                html += `  <pre>${escapeHTML(formattedJson)}</pre>`;
            } else {
                html += '  <ul>';
                for (const [key, value] of Object.entries(data)) {
                    html += `    <li><strong>${escapeHTML(key)}:</strong> ${escapeHTML(String(value))}</li>`;
                }
                html += '  </ul>';
            }
        } else {
            html += '  <p>No data received.</p>';
        }
    }

    html += `  <p><a href="/forms/echo_form.html">Back to Form</a></p>
</section>
</body>
</html>`;

    res.type('html').send(html);
});

module.exports = router;