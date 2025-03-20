// Ollama Connection Diagnostic Script
require('dotenv').config();

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://192.168.50.3:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'llama3';

async function runDiagnostics() {
	console.log('=== Ollama Connection Diagnostics ===');
	console.log(`API URL: ${OLLAMA_API_URL}`);
	console.log(`Default model: ${OLLAMA_DEFAULT_MODEL}`);
	console.log('======================================\n');

	// Step 1: Basic connectivity test
	console.log('1. Testing basic connectivity...');
	try {
		const response = await fetch(`${OLLAMA_API_URL}/api/version`);
		if (response.ok) {
			const data = await response.json();
			console.log(`✓ Connected to Ollama version: ${data.version}`);
		} else {
			console.error(`✗ Failed to connect: ${response.status} ${response.statusText}`);
			console.log('  - Check if Ollama is running');
			console.log(`  - Verify the URL ${OLLAMA_API_URL} is correct`);
			console.log('  - Check for network issues or firewalls');
			return;
		}
	} catch (error) {
		console.error('✗ Connection error:', error.message);
		console.log('  - Check if Ollama server is running');
		console.log(`  - Verify the URL ${OLLAMA_API_URL} is correct`);
		console.log('  - Check your network connectivity');
		return;
	}

	// Step 2: List available models
	console.log('\n2. Checking available models...');
	try {
		const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
		if (response.ok) {
			const data = await response.json();
			if (data.models && data.models.length > 0) {
				console.log('✓ Available models:');
				data.models.forEach(model => {
					console.log(`  - ${model.name}${model.name === OLLAMA_DEFAULT_MODEL ? ' (default)' : ''}`);
				});

				// Check if default model exists
				const defaultModelExists = data.models.some(model => model.name === OLLAMA_DEFAULT_MODEL);
				if (!defaultModelExists) {
					console.log(`\n⚠️ Warning: Default model "${OLLAMA_DEFAULT_MODEL}" not found in available models`);
					console.log('  - You need to update your OLLAMA_DEFAULT_MODEL in .env file');
					console.log(`  - Choose one from the available models listed above`);
				}
			} else {
				console.log('✗ No models found. You need to pull models first.');
				console.log('  - Run: ollama pull gemma:2b');
				console.log('  - Or another model of your choice');
			}
		} else {
			console.error(`✗ Failed to get models: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		console.error('✗ Error listing models:', error.message);
	}

	// Step 3: Test a simple chat completion
	console.log('\n3. Testing a simple chat completion...');

	// Find a model to use for testing
	let modelToUse = OLLAMA_DEFAULT_MODEL;
	try {
		const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
		if (response.ok) {
			const data = await response.json();
			if (data.models && data.models.length > 0) {
				const availableModels = data.models.map(model => model.name);
				if (!availableModels.includes(modelToUse)) {
					modelToUse = data.models[0].name;
					console.log(`Using model "${modelToUse}" for testing (default model not available)`);
				}
			}
		}
	} catch (error) {
		console.error('✗ Error finding a model to use:', error.message);
		return;
	}

	try {
		console.log(`Sending test request to model: ${modelToUse}...`);
		const chatPayload = {
			model: modelToUse,
			messages: [
				{ role: 'system', content: 'You are a helpful assistant.' },
				{ role: 'user', content: 'Say hello world' }
			],
			stream: false,
			options: {
				temperature: 0.1
			}
		};

		const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(chatPayload)
		});

		if (response.ok) {
			try {
				const contentType = response.headers.get('content-type');
				console.log(`Content-Type: ${contentType}`);

				if (contentType && contentType.includes('application/json')) {
					const data = await response.json();
					console.log('✓ Chat completion successful');
					console.log('Response:');
					console.log(`"${data.message?.content}"`);
				} else {
					const text = await response.text();
					console.log('⚠️ Warning: Response is not JSON. Raw response:');
					console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
				}
			} catch (error) {
				const text = await response.text();
				console.error('✗ Error parsing JSON response:', error.message);
				console.log('Raw response (first 200 chars):');
				console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
			}
		} else {
			console.error(`✗ Chat completion failed: ${response.status} ${response.statusText}`);
			try {
				const error = await response.text();
				console.log('Error details:', error);
			} catch (e) {
				console.log('Could not parse error details');
			}
		}
	} catch (error) {
		console.error('✗ Error during chat completion:', error.message);
	}

	// Step 4: Check streaming mode
	console.log('\n4. Testing streaming mode...');
	try {
		console.log(`Sending streaming test to model: ${modelToUse}...`);
		const streamPayload = {
			model: modelToUse,
			messages: [
				{ role: 'user', content: 'Count from 1 to 3 very briefly' }
			],
			stream: true,
			options: {
				temperature: 0.1
			}
		};

		const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(streamPayload)
		});

		if (response.ok) {
			if (response.body) {
				console.log('✓ Streaming response started');
				console.log('First chunks of streaming response:');

				const reader = response.body.getReader();
				let chunks = 0;
				let streamContent = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done || chunks >= 3) break;

					try {
						const chunk = new TextDecoder().decode(value);
						streamContent += chunk;
						console.log(`  Chunk ${++chunks}: ${chunk.substring(0, 50).replace(/\n/g, '\\n')}${chunk.length > 50 ? '...' : ''}`);
					} catch (e) {
						console.log(`  [Binary data chunk ${++chunks}]`);
					}
				}

				console.log('✓ Streaming mode working');

				try {
					// Try to parse the response as JSON lines
					const jsonLines = streamContent.trim().split('\n');
					const parsedLine = JSON.parse(jsonLines[0]);
					if (parsedLine && typeof parsedLine === 'object') {
						console.log('✓ JSON streaming format confirmed');
					}
				} catch (e) {
					console.log('⚠️ Warning: Could not parse streaming response as JSON lines');
					console.log('  This might be expected depending on your Ollama version');
				}

				// Close the reader
				reader.cancel();
			} else {
				console.log('⚠️ Response body is null, cannot read stream');
			}
		} else {
			console.error(`✗ Streaming test failed: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		console.error('✗ Error testing streaming mode:', error.message);
	}

	console.log('\n=== Diagnostics Complete ===');
}

runDiagnostics().catch(error => {
	console.error('Fatal error running diagnostics:', error);
});
