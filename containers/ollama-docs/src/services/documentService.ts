import { logger } from '@starbunk/shared';
import { OllamaService } from './ollama/ollamaService';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import mime from 'mime-types';

export interface ProcessedDocument {
	id: string;
	filename: string;
	content: string;
	summary: string;
	embeddings?: number[];
	metadata: {
		fileSize: number;
		mimeType: string;
		processedAt: Date;
		wordCount: number;
		pageCount?: number;
	};
}

export interface DocumentQuery {
	query: string;
	userId: string;
	guildId: string;
	maxResults?: number;
	similarity?: number;
}

export interface DocumentSearchResult {
	document: ProcessedDocument;
	relevanceScore: number;
	excerpt: string;
}

export class DocumentService {
	private ollamaService: OllamaService;
	private documentsPath: string;
	private documents: Map<string, ProcessedDocument> = new Map();

	constructor(ollamaService: OllamaService, documentsPath: string = './data/documents') {
		this.ollamaService = ollamaService;
		this.documentsPath = documentsPath;
		this.initializeStorage();
	}

	private async initializeStorage(): Promise<void> {
		try {
			await fs.mkdir(this.documentsPath, { recursive: true });
			logger.info(`📁 Document storage initialized at: ${this.documentsPath}`);
		} catch (error) {
			logger.error(`❌ Failed to initialize document storage: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Process and store a document
	 */
	async processDocument(filePath: string, filename: string): Promise<ProcessedDocument> {
		try {
			logger.info(`📄 Processing document: ${filename}`);

			// Read file
			const fileBuffer = await fs.readFile(filePath);
			const stats = await fs.stat(filePath);
			const mimeType = mime.lookup(filename) || 'application/octet-stream';

			// Extract text content based on file type
			let content: string;
			let pageCount: number | undefined;

			switch (mimeType) {
				case 'application/pdf': {
					const pdfData = await pdfParse(fileBuffer);
					content = pdfData.text;
					pageCount = pdfData.numpages;
					break;
				}

				case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
					const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
					content = docxResult.value;
					break;
				}

				case 'text/plain':
				case 'text/markdown':
					content = fileBuffer.toString('utf-8');
					break;

				default:
					throw new Error(`Unsupported file type: ${mimeType}`);
			}

			if (!content || content.trim().length === 0) {
				throw new Error('No text content could be extracted from the document');
			}

			// Generate summary using Ollama
			const summary = await this.generateSummary(content, filename);

			// Generate embeddings for semantic search
			let embeddings: number[] | undefined;
			try {
				embeddings = await this.ollamaService.generateEmbeddings(content);
			} catch (error) {
				logger.warn(`⚠️ Could not generate embeddings for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
			}

			// Create processed document
			const document: ProcessedDocument = {
				id: this.generateDocumentId(filename),
				filename,
				content,
				summary,
				embeddings,
				metadata: {
					fileSize: stats.size,
					mimeType,
					processedAt: new Date(),
					wordCount: content.split(/\s+/).length,
					pageCount,
				},
			};

			// Store document
			this.documents.set(document.id, document);
			await this.saveDocumentToDisk(document);

			logger.info(`✅ Document processed successfully: ${filename} (${document.metadata.wordCount} words)`);
			return document;

		} catch (error) {
			logger.error(`❌ Failed to process document ${filename}: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
	}

	/**
	 * Generate a summary of the document content
	 */
	private async generateSummary(content: string, filename: string): Promise<string> {
		try {
			// Truncate content if too long (keep first 4000 characters for summary)
			const truncatedContent = content.length > 4000 ? content.substring(0, 4000) + '...' : content;

			const response = await this.ollamaService.generateCompletion({
				model: 'llama2', // Use default model
				messages: [
					{
						role: 'system',
						content: 'You are a document summarizer. Create a concise, informative summary of the provided document content. Focus on key points, main topics, and important information. Keep the summary under 200 words.'
					},
					{
						role: 'user',
						content: `Please summarize this document "${filename}":\n\n${truncatedContent}`
					}
				],
				temperature: 0.3,
				max_tokens: 250,
			});

			return response.message.content.trim();

		} catch (error) {
			logger.warn(`⚠️ Could not generate summary for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
			return `Document: ${filename} (${content.split(/\s+/).length} words)`;
		}
	}

	/**
	 * Search documents based on query
	 */
	async searchDocuments(query: DocumentQuery): Promise<DocumentSearchResult[]> {
		try {
			logger.info(`🔍 Searching documents for: "${query.query}"`);

			const results: DocumentSearchResult[] = [];

			// Simple text-based search for now
			// TODO: Implement semantic search using embeddings
			for (const document of this.documents.values()) {
				const relevanceScore = this.calculateTextRelevance(query.query, document.content);
				
				if (relevanceScore > (query.similarity || 0.1)) {
					const excerpt = this.extractRelevantExcerpt(query.query, document.content);
					
					results.push({
						document,
						relevanceScore,
						excerpt,
					});
				}
			}

			// Sort by relevance score (highest first)
			results.sort((a, b) => b.relevanceScore - a.relevanceScore);

			// Limit results
			const maxResults = query.maxResults || 5;
			const limitedResults = results.slice(0, maxResults);

			logger.info(`🔍 Found ${limitedResults.length} relevant documents`);
			return limitedResults;

		} catch (error) {
			logger.error(`❌ Document search failed: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
	}

	/**
	 * Answer a question based on document content
	 */
	async answerQuestion(query: string, documents: ProcessedDocument[]): Promise<string> {
		try {
			if (documents.length === 0) {
				return "I couldn't find any relevant documents to answer your question.";
			}

			// Combine relevant document content
			const context = documents
				.slice(0, 3) // Use top 3 most relevant documents
				.map(doc => `Document: ${doc.filename}\n${doc.content.substring(0, 2000)}`)
				.join('\n\n---\n\n');

			const response = await this.ollamaService.generateCompletion({
				model: 'llama2',
				messages: [
					{
						role: 'system',
						content: 'You are a helpful document assistant. Answer questions based on the provided document content. Be accurate and cite which document(s) you\'re referencing. If the documents don\'t contain enough information to answer the question, say so clearly.'
					},
					{
						role: 'user',
						content: `Based on the following documents, please answer this question: "${query}"\n\nDocuments:\n${context}`
					}
				],
				temperature: 0.2,
				max_tokens: 500,
			});

			return response.message.content.trim();

		} catch (error) {
			logger.error(`❌ Failed to answer question: ${error instanceof Error ? error.message : String(error)}`);
			return "I encountered an error while trying to answer your question. Please try again.";
		}
	}

	/**
	 * Get all stored documents
	 */
	getDocuments(): ProcessedDocument[] {
		return Array.from(this.documents.values());
	}

	/**
	 * Get document by ID
	 */
	getDocument(id: string): ProcessedDocument | undefined {
		return this.documents.get(id);
	}

	/**
	 * Delete a document
	 */
	async deleteDocument(id: string): Promise<boolean> {
		try {
			const document = this.documents.get(id);
			if (!document) {
				return false;
			}

			this.documents.delete(id);
			
			// Remove from disk
			const filePath = path.join(this.documentsPath, `${id}.json`);
			try {
				await fs.unlink(filePath);
			} catch (_error) {
				logger.warn(`⚠️ Could not delete document file: ${filePath}`);
			}

			logger.info(`🗑️ Document deleted: ${document.filename}`);
			return true;

		} catch (error) {
			logger.error(`❌ Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	// Helper methods

	private generateDocumentId(filename: string): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '_');
		return `${cleanName}_${timestamp}_${random}`;
	}

	private async saveDocumentToDisk(document: ProcessedDocument): Promise<void> {
		try {
			const filePath = path.join(this.documentsPath, `${document.id}.json`);
			await fs.writeFile(filePath, JSON.stringify(document, null, 2));
		} catch (error) {
			logger.warn(`⚠️ Could not save document to disk: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private calculateTextRelevance(query: string, content: string): number {
		const queryWords = query.toLowerCase().split(/\s+/);
		const contentLower = content.toLowerCase();
		
		let matches = 0;
		for (const word of queryWords) {
			if (word.length > 2 && contentLower.includes(word)) {
				matches++;
			}
		}
		
		return matches / queryWords.length;
	}

	private extractRelevantExcerpt(query: string, content: string, maxLength: number = 200): string {
		const queryWords = query.toLowerCase().split(/\s+/);
		const sentences = content.split(/[.!?]+/);
		
		// Find sentence with most query word matches
		let bestSentence = sentences[0] || '';
		let bestScore = 0;
		
		for (const sentence of sentences) {
			const sentenceLower = sentence.toLowerCase();
			let score = 0;
			
			for (const word of queryWords) {
				if (word.length > 2 && sentenceLower.includes(word)) {
					score++;
				}
			}
			
			if (score > bestScore) {
				bestScore = score;
				bestSentence = sentence;
			}
		}
		
		// Truncate if too long
		if (bestSentence.length > maxLength) {
			bestSentence = bestSentence.substring(0, maxLength) + '...';
		}
		
		return bestSentence.trim();
	}
}
