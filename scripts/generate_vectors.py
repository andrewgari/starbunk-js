import os
import json
import numpy as np
import fitz  # PyMuPDF for PDF processing
import argparse
from sentence_transformers import SentenceTransformer

def get_embeddings(texts, model_name='all-mpnet-base-v2'):
    """Generates embeddings for a list of texts."""
    model = SentenceTransformer(model_name)
    embeddings = model.encode(texts)
    return embeddings

def chunk_text(text, chunk_size=512):
    """Chunks text into smaller pieces."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text = ''
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
    return text

def process_directory(directory_path, metadata, file_count, chunk_count):
    """Process all files in a directory."""
    for file in os.listdir(directory_path):
        file_path = os.path.join(directory_path, file)
        if os.path.isfile(file_path) and file.lower().endswith(('.txt', '.md', '.json', '.pdf')):
            print(f"Processing: {file_path}")
            try:
                if file.lower().endswith('.pdf'):
                    text = extract_text_from_pdf(file_path)
                else:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        text = f.read()

                chunks = chunk_text(text)
                embeddings = get_embeddings(chunks)

                for i, embedding in enumerate(embeddings):
                    embedding_filename = f'embedding_{file_count}_{chunk_count}.npy'
                    embedding_path = os.path.join(context_dir, embedding_filename)
                    np.save(embedding_path, embedding)

                    metadata.append({
                        'file_path': file_path,
                        'chunk_id': i,
                        'embedding_filename': embedding_filename,
                    })
                    chunk_count += 1
                file_count += 1
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
    return file_count, chunk_count

def process_campaign(campaign_dir, context_dir, include_gm=False, model_name='all-mpnet-base-v2', chunk_size=512):
    """Process a campaign directory and generate embeddings."""
    os.makedirs(context_dir, exist_ok=True)
    metadata = []
    file_count = 0
    chunk_count = 0

    # Process each category directory
    for category in ['core_rules', 'textbooks', 'characters', 'session_recaps', 'notes']:
        category_dir = os.path.join(campaign_dir, category)
        if not os.path.exists(category_dir):
            continue

        # Always process player content
        player_dir = os.path.join(category_dir, 'player')
        if os.path.exists(player_dir):
            print(f"Processing player content in {category}")
            file_count, chunk_count = process_directory(player_dir, metadata, file_count, chunk_count)

        # Process GM content if included
        if include_gm:
            gm_dir = os.path.join(category_dir, 'gm')
            if os.path.exists(gm_dir):
                print(f"Processing GM content in {category}")
                file_count, chunk_count = process_directory(gm_dir, metadata, file_count, chunk_count)

    # Save metadata
    metadata_path = os.path.join(context_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)

    print(f"Processed {file_count} files and generated {chunk_count} chunks")
    print("Vector generation complete.")

def main():
    parser = argparse.ArgumentParser(description='Generate embeddings for campaign content.')
    parser.add_argument('--campaign-dir', required=True, help='Path to campaign directory')
    parser.add_argument('--context-dir', required=True, help='Path to output context directory')
    parser.add_argument('--include-gm', type=str, default='false', help='Include GM content (true/false)')
    parser.add_argument('--model-name', default='all-mpnet-base-v2', help='Model name for sentence transformer')
    parser.add_argument('--chunk-size', type=int, default=512, help='Chunk size for text splitting')

    args = parser.parse_args()
    include_gm = args.include_gm.lower() == 'true'

    process_campaign(
        args.campaign_dir,
        args.context_dir,
        include_gm=include_gm,
        model_name=args.model_name,
        chunk_size=args.chunk_size
    )

if __name__ == '__main__':
    main()
