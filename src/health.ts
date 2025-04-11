import http from 'http';

const server = http.createServer((req, res) => {
	if (req.url === '/health' && req.method === 'GET') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
	} else {
		res.writeHead(404);
		res.end();
	}
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`Health check server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
	server.close(() => {
		console.log('Health check server terminated');
		process.exit(0);
	});
});
