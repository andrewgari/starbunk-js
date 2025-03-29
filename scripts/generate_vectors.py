#!/usr/bin/env python3

from pathlib import Path
from sentence_transformers import SentenceTransformer
from typing import Dict, List, Optional, TypedDict, Union
import argparse
import json
import numpy as np
import os
import sys

class VectorMetadata(TypedDict):
    file: str
    is_gm_content: bool
    chunk_size: int

class TextWithMetadata(TypedDict):
    text: str
    metadata: VectorMetadata

def get_embeddings(texts: List[str], model: SentenceTransformer) -> np.ndarray:
    """Generate embeddings for a list of texts."""
    return model.encode(texts, show_progress_bar=False)

def process_directory(
    directory: Path,
    model: SentenceTransformer,
    chunk_size: int = 512,
    is_gm_content: bool = False
) -> List[TextWithMetadata]:
    """Process all text files in a directory and return content with metadata."""
    content: List[TextWithMetadata] = []

    for file_path in directory.rglob('*'):
        if not file_path.is_file():
            continue

        if file_path.suffix.lower() not in ['.txt', '.md']:
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

            # Split into chunks if needed
            if len(text) > chunk_size:
                chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
            else:
                chunks = [text]

            # Add each chunk with metadata
            for chunk in chunks:
                content.append({
                    'text': chunk,
                    'metadata': {
                        'file': str(file_path.relative_to(directory)),
                        'is_gm_content': is_gm_content,
                        'chunk_size': chunk_size
                    }
                })

        except Exception as e:
            print(json.dumps({
                'error': f'Error processing {file_path}: {str(e)}'
            }), file=sys.stderr)

    return content

def save_vectors(
    vectors: np.ndarray,
    metadata: List[VectorMetadata],
    texts: List[str],
    output_dir: Path
) -> None:
    """Save vectors, metadata, and texts to the output directory."""
    try:
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save vectors
        np.save(output_dir / 'vectors.npy', vectors)

        # Save metadata
        with open(output_dir / 'metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False)

        # Save texts
        with open(output_dir / 'texts.json', 'w', encoding='utf-8') as f:
            json.dump(texts, f, ensure_ascii=False)
    except Exception as e:
        print(json.dumps({
            'error': f'Error saving vectors: {str(e)}'
        }), file=sys.stderr)
        raise

def main() -> None:
    parser = argparse.ArgumentParser(description='Generate vector embeddings for campaign content')
    parser.add_argument('--campaign-dir', required=True, help='Campaign directory to process')
    parser.add_argument('--context-dir', required=True, help='Output directory for vectors')
    parser.add_argument('--include-gm', type=str, default='false', help='Whether to include GM content')
    parser.add_argument('--model-name', default='all-MiniLM-L6-v2', help='Model to use for embeddings')
    parser.add_argument('--chunk-size', type=int, default=512, help='Size of text chunks')
    parser.add_argument('--namespace', help='Optional namespace for vectors')
    parser.add_argument('--text-file', help='Optional JSON file containing texts to process')
    args = parser.parse_args()

    try:
        # Load model
        model = SentenceTransformer(args.model_name)

        campaign_dir = Path(args.campaign_dir)
        context_dir = Path(args.context_dir)
        include_gm = args.include_gm.lower() == 'true'

        if args.text_file:
            # Process texts from file
            with open(args.text_file, 'r', encoding='utf-8') as f:
                texts_with_metadata: List[TextWithMetadata] = json.load(f)

            texts = [item['text'] for item in texts_with_metadata]
            metadata = [item['metadata'] for item in texts_with_metadata]
            vectors = get_embeddings(texts, model)

            output_dir = context_dir
            if args.namespace:
                output_dir = output_dir / args.namespace

            save_vectors(vectors, metadata, texts, output_dir)
        else:
            # Process directory content
            # Process player content
            player_dir = campaign_dir / 'player'
            if player_dir.exists():
                player_content = process_directory(
                    player_dir,
                    model,
                    args.chunk_size,
                    is_gm_content=False
                )

                if player_content:
                    texts = [item['text'] for item in player_content]
                    metadata = [item['metadata'] for item in player_content]
                    vectors = get_embeddings(texts, model)

                    output_dir = context_dir
                    if args.namespace:
                        output_dir = output_dir / args.namespace

                    save_vectors(vectors, metadata, texts, output_dir)

            # Process GM content if requested
            if include_gm:
                gm_dir = campaign_dir / 'gm'
                if gm_dir.exists():
                    gm_content = process_directory(
                        gm_dir,
                        model,
                        args.chunk_size,
                        is_gm_content=True
                    )

                    if gm_content:
                        texts = [item['text'] for item in gm_content]
                        metadata = [item['metadata'] for item in gm_content]
                        vectors = get_embeddings(texts, model)

                        output_dir = context_dir
                        if args.namespace:
                            output_dir = output_dir / args.namespace

                        save_vectors(vectors, metadata, texts, output_dir)

        print(json.dumps({'status': 'success'}))

    except Exception as e:
        print(json.dumps({
            'error': str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
