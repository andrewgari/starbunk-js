import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	AttachmentBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { logger } from '@starbunk/shared';
import { DocumentService } from '../../documentService';
import { OllamaService } from '../../ollama/ollamaService';
import * as fs from 'fs/promises';
import * as path from 'path';

const commandBuilder = new SlashCommandBuilder()
	.setName('docs')
	.setDescription('Interact with the Ollama-powered document assistant')
	.addSubcommand(subcommand =>
		subcommand
			.setName('upload')
			.setDescription('Upload a document for processing')
			.addAttachmentOption(option =>
				option
					.setName('file')
					.setDescription('Document to upload (PDF, DOCX, TXT, MD)')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('search')
			.setDescription('Search through uploaded documents')
			.addStringOption(option =>
				option
					.setName('query')
					.setDescription('Search query')
					.setRequired(true)
			)
			.addIntegerOption(option =>
				option
					.setName('limit')
					.setDescription('Maximum number of results (default: 5)')
					.setMinValue(1)
					.setMaxValue(10)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('ask')
			.setDescription('Ask a question about the documents')
			.addStringOption(option =>
				option
					.setName('question')
					.setDescription('Your question')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('list')
			.setDescription('List all uploaded documents')
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('delete')
			.setDescription('Delete a document')
			.addStringOption(option =>
				option
					.setName('document_id')
					.setDescription('ID of the document to delete')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('status')
			.setDescription('Check Ollama service status')
	);

// Role-based access control
const ALLOWED_ROLES = ['admin', 'moderator', 'document-user']; // Configurable roles
const UPLOAD_ROLES = ['admin', 'moderator']; // Only these roles can upload

function hasRequiredRole(interaction: ChatInputCommandInteraction, requiredRoles: string[]): boolean {
	if (!interaction.member || !interaction.guild) return false;
	
	const member = interaction.guild.members.cache.get(interaction.user.id);
	if (!member) return false;
	
	// Check if user has any of the required roles
	return member.roles.cache.some(role => 
		requiredRoles.some(requiredRole => 
			role.name.toLowerCase().includes(requiredRole.toLowerCase())
		)
	);
}

export default {
	data: commandBuilder.toJSON(),
	permission: [], // We'll handle permissions manually
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			// Initialize services
			const ollamaService = new OllamaService(
				process.env.OLLAMA_URL || 'http://localhost:11434',
				process.env.OLLAMA_MODEL || 'llama2'
			);
			const documentService = new DocumentService(ollamaService);

			const subcommand = interaction.options.getSubcommand();

			// Check basic access
			if (!hasRequiredRole(interaction, ALLOWED_ROLES)) {
				await interaction.reply({
					content: '❌ You do not have permission to use the document assistant.',
					ephemeral: true
				});
				return;
			}

			switch (subcommand) {
				case 'upload':
					await handleUpload(interaction, documentService);
					break;
				case 'search':
					await handleSearch(interaction, documentService);
					break;
				case 'ask':
					await handleAsk(interaction, documentService);
					break;
				case 'list':
					await handleList(interaction, documentService);
					break;
				case 'delete':
					await handleDelete(interaction, documentService);
					break;
				case 'status':
					await handleStatus(interaction, ollamaService);
					break;
				default:
					await interaction.reply({
						content: '❌ Unknown subcommand.',
						ephemeral: true
					});
			}

		} catch (error) {
			logger.error('❌ Error in docs command:', error instanceof Error ? error : new Error(String(error)));
			
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			
			if (interaction.replied || interaction.deferred) {
				await interaction.editReply(`❌ Error: ${errorMessage}`);
			} else {
				await interaction.reply({
					content: `❌ Error: ${errorMessage}`,
					ephemeral: true
				});
			}
		}
	},
};

async function handleUpload(interaction: ChatInputCommandInteraction, documentService: DocumentService) {
	// Check upload permissions
	if (!hasRequiredRole(interaction, UPLOAD_ROLES)) {
		await interaction.reply({
			content: '❌ You do not have permission to upload documents.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply();

	const attachment = interaction.options.getAttachment('file');
	if (!attachment) {
		await interaction.editReply('❌ No file attachment found.');
		return;
	}

	// Validate file type
	const allowedTypes = [
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'text/plain',
		'text/markdown'
	];

	if (!allowedTypes.includes(attachment.contentType || '')) {
		await interaction.editReply('❌ Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.');
		return;
	}

	// Validate file size (10MB limit)
	if (attachment.size > 10 * 1024 * 1024) {
		await interaction.editReply('❌ File too large. Maximum size is 10MB.');
		return;
	}

	try {
		// Download file
		const response = await fetch(attachment.url);
		const buffer = await response.arrayBuffer();
		
		// Save temporarily
		const tempPath = path.join('/tmp', `upload_${Date.now()}_${attachment.name}`);
		await fs.writeFile(tempPath, Buffer.from(buffer));

		// Process document
		const document = await documentService.processDocument(tempPath, attachment.name);

		// Clean up temp file
		await fs.unlink(tempPath);

		// Create success embed
		const embed = new EmbedBuilder()
			.setTitle('📄 Document Uploaded Successfully')
			.setColor(0x00ff00)
			.addFields(
				{ name: 'Filename', value: document.filename, inline: true },
				{ name: 'Document ID', value: document.id, inline: true },
				{ name: 'File Size', value: `${(document.metadata.fileSize / 1024).toFixed(1)} KB`, inline: true },
				{ name: 'Word Count', value: document.metadata.wordCount.toString(), inline: true },
				{ name: 'Summary', value: document.summary.substring(0, 1000) + (document.summary.length > 1000 ? '...' : '') }
			)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });

	} catch (error) {
		logger.error('❌ Upload failed:', error instanceof Error ? error : new Error(String(error)));
		await interaction.editReply(`❌ Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function handleSearch(interaction: ChatInputCommandInteraction, documentService: DocumentService) {
	await interaction.deferReply();

	const query = interaction.options.getString('query', true);
	const limit = interaction.options.getInteger('limit') || 5;

	const searchQuery = {
		query,
		userId: interaction.user.id,
		guildId: interaction.guildId || '',
		maxResults: limit,
		similarity: 0.1
	};

	const results = await documentService.searchDocuments(searchQuery);

	if (results.length === 0) {
		await interaction.editReply('🔍 No documents found matching your query.');
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle(`🔍 Search Results for "${query}"`)
		.setColor(0x0099ff)
		.setDescription(`Found ${results.length} relevant document(s)`)
		.setTimestamp();

	for (const result of results.slice(0, 5)) {
		embed.addFields({
			name: `📄 ${result.document.filename}`,
			value: `**Relevance:** ${(result.relevanceScore * 100).toFixed(1)}%\n**Excerpt:** ${result.excerpt}\n**ID:** \`${result.document.id}\``,
			inline: false
		});
	}

	await interaction.editReply({ embeds: [embed] });
}

async function handleAsk(interaction: ChatInputCommandInteraction, documentService: DocumentService) {
	await interaction.deferReply();

	const question = interaction.options.getString('question', true);

	// First search for relevant documents
	const searchQuery = {
		query: question,
		userId: interaction.user.id,
		guildId: interaction.guildId || '',
		maxResults: 3,
		similarity: 0.1
	};

	const searchResults = await documentService.searchDocuments(searchQuery);
	
	if (searchResults.length === 0) {
		await interaction.editReply('❓ I couldn\'t find any relevant documents to answer your question. Try uploading some documents first.');
		return;
	}

	// Generate answer based on relevant documents
	const relevantDocs = searchResults.map(result => result.document);
	const answer = await documentService.answerQuestion(question, relevantDocs);

	const embed = new EmbedBuilder()
		.setTitle('🤖 Document Assistant Answer')
		.setColor(0x9932cc)
		.addFields(
			{ name: 'Question', value: question },
			{ name: 'Answer', value: answer.substring(0, 1000) + (answer.length > 1000 ? '...' : '') },
			{ name: 'Sources', value: relevantDocs.map(doc => `• ${doc.filename}`).join('\n') }
		)
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction, documentService: DocumentService) {
	await interaction.deferReply();

	const documents = documentService.getDocuments();

	if (documents.length === 0) {
		await interaction.editReply('📚 No documents have been uploaded yet.');
		return;
	}

	const embed = new EmbedBuilder()
		.setTitle('📚 Uploaded Documents')
		.setColor(0xffa500)
		.setDescription(`Total: ${documents.length} document(s)`)
		.setTimestamp();

	for (const doc of documents.slice(0, 10)) { // Show first 10
		embed.addFields({
			name: `📄 ${doc.filename}`,
			value: `**ID:** \`${doc.id}\`\n**Size:** ${(doc.metadata.fileSize / 1024).toFixed(1)} KB\n**Words:** ${doc.metadata.wordCount}\n**Uploaded:** ${doc.metadata.processedAt.toLocaleDateString()}`,
			inline: true
		});
	}

	if (documents.length > 10) {
		embed.setFooter({ text: `Showing first 10 of ${documents.length} documents` });
	}

	await interaction.editReply({ embeds: [embed] });
}

async function handleDelete(interaction: ChatInputCommandInteraction, documentService: DocumentService) {
	// Check upload permissions (same as delete permissions)
	if (!hasRequiredRole(interaction, UPLOAD_ROLES)) {
		await interaction.reply({
			content: '❌ You do not have permission to delete documents.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply();

	const documentId = interaction.options.getString('document_id', true);
	const success = await documentService.deleteDocument(documentId);

	if (success) {
		await interaction.editReply(`✅ Document deleted successfully: \`${documentId}\``);
	} else {
		await interaction.editReply(`❌ Document not found: \`${documentId}\``);
	}
}

async function handleStatus(interaction: ChatInputCommandInteraction, ollamaService: OllamaService) {
	await interaction.deferReply();

	const healthInfo = await ollamaService.getHealthInfo();

	const embed = new EmbedBuilder()
		.setTitle('🦙 Ollama Service Status')
		.setColor(healthInfo.available ? 0x00ff00 : 0xff0000)
		.addFields(
			{ name: 'Status', value: healthInfo.available ? '✅ Online' : '❌ Offline', inline: true },
			{ name: 'Base URL', value: healthInfo.baseUrl, inline: true },
			{ name: 'Default Model', value: healthInfo.defaultModel, inline: true },
			{ name: 'Available Models', value: healthInfo.models.toString(), inline: true }
		)
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}
