import { VectorMetadata } from '../services/vectorService';

export interface TextWithMetadata {
	text: string;
	metadata: VectorMetadata;
}
