#!/usr/bin/env python3

import argparse
import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

def load_vectors(context_dir: str) -> tuple[np.ndarray, List[Dict[str, Any]], List[str]]:
    """Load vectors and metadata from the context directory."""
    context_path = Path(context_dir)

    # Load vectors
    vectors = np.load(context_path / 'vectors.npy')

    # Load metadata
    with open(context_path / 'metadata.json', 'r') as f:
        metadata = json.load(f)

    # Load texts
    with open(context_path / 'texts.json', 'r') as f:
        texts = json.load(f)

    return vectors, metadata, texts

def search_vectors(
    query: str,
    vectors: np.ndarray,
    metadata: List[Dict[str, Any]],
    texts: List[str],
    model: SentenceTransformer,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """Search for similar vectors and return results with metadata."""
    # Generate query vector
    query_vector = model.encode([query])[0]

    # Calculate similarities
    similarities = np.dot(vectors, query_vector)

    # Get top k indices
    top_k_indices = np.argsort(similarities)[-limit:][::-1]

    # Format results
    results = []
    for idx in top_k_indices:
        results.append({
            'text': texts[idx],
            'metadata': metadata[idx],
            'similarity': float(similarities[idx])
        })

    return results

def main():
    parser = argparse.ArgumentParser(description='Search through vector embeddings')
    parser.add_argument('--context-dir', required=True, help='Directory containing vectors and metadata')
    parser.add_argument('--query', required=True, help='Search query')
    parser.add_argument('--limit', type=int, default=3, help='Number of results to return')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='Model to use for embeddings')
    args = parser.parse_args()

    try:
        # Load model
        model = SentenceTransformer(args.model)

        # Load vectors and metadata
        vectors, metadata, texts = load_vectors(args.context_dir)

        # Search
        results = search_vectors(args.query, vectors, metadata, texts, model, args.limit)

        # Output results as JSON
        print(json.dumps(results))

    except Exception as e:
        print(json.dumps({
            'error': str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
