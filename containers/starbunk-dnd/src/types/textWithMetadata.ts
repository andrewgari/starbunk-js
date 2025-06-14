
export interface TextWithMetadata {
	text: string;
	metadata: {
		file: string;
		isGMContent?: boolean;
		is_gm_content?: boolean;
		chunk_size?: number;
		[key: string]: unknown;
	};
	similarity?: number;
}

// VectorSearchResult is now the same as TextWithMetadata
// This maintains backward compatibility
