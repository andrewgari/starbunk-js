import express from 'express';
import cors from 'cors';
import { WebServer } from '../server';

/**
 * Test-specific WebServer that bypasses rate limiting for comprehensive testing
 */
export class TestWebServer extends WebServer {
	constructor(port: number = 0, useDatabase: boolean = false) {
		super(port, useDatabase);
	}

	protected setupMiddleware(): void {
		// CORS
		this.app.use(
			cors({
				origin: true,
				credentials: true,
			}),
		);

		// Body parsing
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Skip rate limiting for tests
		// Skip request logging for cleaner test output
	}

	protected setupRoutes(): void {
		// Call parent setupRoutes to get all the routes without rate limiting
		super.setupRoutes();
	}

	// Override to make it accessible for testing
	public getApp() {
		return this.app;
	}
}
