const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('DIAGNOSTIC SERVER ALIVE\n');
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    const log = `Server started on port ${PORT} at ${new Date().toISOString()}\n`;
    fs.appendFileSync('server_log.txt', log);
    console.log(log);
});
