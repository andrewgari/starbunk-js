import os
import json
import numpy as np
import fitz  # PyMuPDF for PDF processing
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

def process_files(root_dir, context_dir='llm_context/'):
    """Processes files in a directory and generates embeddings."""

    os.makedirs(context_dir, exist_ok=True)
    metadata = []
    file_count = 0
    chunk_count = 0

    for subdir, dirs, files in os.walk(root_dir):
        if 'player' in subdir:  # Process only player-accessible data
            for file in files:
                file_path = os.path.join(subdir, file)
                if file.lower().endswith(('.txt', '.md', '.json', '.pdf')):
                    print(f"Processing: {file_path}")
                    if file.lower().endswith('.pdf'):
                        text = extract_text_from_pdf(file_path)
                    else:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                text = f.read()
                        except Exception as e:
                            print(f"Error reading {file_path}: {e}")
                            continue

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
                        chunk_count +=1
                    file_count += 1
    with open(os.path.join(context_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=4)
    print("Embedding generation complete.")

# Example usage
root_directory = 'campaignId/' #replace with your directory.
process_files(root_directory)
