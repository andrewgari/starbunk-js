#!/usr/bin/env node

const { QdrantClient } = require('@qdrant/js-client-rest');

async function initializeCollections() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY
    });

    // Collections from PR 248 QdrantMemoryService implementation
    const collections = [
        {
            name: 'covabot_personality',
            vectorSize: 384,
            distance: 'Cosine',
            description: 'Personality traits and characteristics for CovaBot'
        },
        {
            name: 'covabot_conversations',
            vectorSize: 384,
            distance: 'Cosine',
            description: 'Conversation history and context for CovaBot'
        },
        {
            name: 'covabot_memory',
            vectorSize: 384,
            distance: 'Cosine',
            description: 'Unified memory management for CovaBot'
        }
    ];

    console.log('🚀 Initializing Qdrant collections for CovaBot...');

    for (const config of collections) {
        try {
            console.log(`Creating collection: ${config.name}`);
            await client.createCollection(config.name, {
                vectors: {
                    size: config.vectorSize,
                    distance: config.distance,
                    on_disk: true
                },
                optimizers_config: {
                    deleted_threshold: 0.2,
                    vacuum_min_vector_number: 1000,
                    default_segment_number: 2
                },
                replication_factor: 1,
                write_consistency_factor: 1
            });
            console.log(`✅ Collection ${config.name} created successfully`);
            console.log(`   Description: ${config.description}`);
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`⚠️  Collection ${config.name} already exists`);
            } else {
                console.error(`❌ Failed to create collection ${config.name}:`, error.message);
            }
        }
    }

    // Verify collections were created
    console.log('\n📊 Verifying collections...');
    try {
        const collectionsResponse = await client.getCollections();
        const createdCollections = collectionsResponse.collections.map(c => c.name);
        
        for (const config of collections) {
            if (createdCollections.includes(config.name)) {
                console.log(`✅ ${config.name} - Ready`);
            } else {
                console.log(`❌ ${config.name} - Missing`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to verify collections:', error.message);
    }

    console.log('\n🎉 Collection initialization complete!');
    console.log('CovaBot is ready to use Qdrant vector database.');
}

// Handle command line execution
if (require.main === module) {
    initializeCollections().catch(error => {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    });
}

module.exports = { initializeCollections };
