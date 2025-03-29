#!/usr/bin/env python3

import argparse
import json
import numpy as np
import sys
import traceback
import os

def main():
    parser = argparse.ArgumentParser(description='Save vectors to a numpy file')
    parser.add_argument('--vectors', type=str, required=True, help='Path to the vectors JSON file')
    parser.add_argument('--output', type=str, required=True, help='Path to save the numpy file')
    args = parser.parse_args()

    try:
        # Load vectors from JSON file
        with open(args.vectors, 'r') as f:
            try:
                vectors = json.load(f)
                print(f"Loaded vectors from {args.vectors}, found {len(vectors)} entries", file=sys.stderr)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON at line {e.lineno}, column {e.colno}, position {e.pos}: {e.msg}", file=sys.stderr)
                sys.exit(1)

        # Validate vectors format
        if not isinstance(vectors, list):
            print(f"Error: Expected list of vectors, got {type(vectors)}", file=sys.stderr)
            sys.exit(1)

        # Convert to numpy array
        try:
            # Handle both list of lists and direct embedding format
            vectors_array = np.array(vectors, dtype=np.float32)
            print(f"Converted to numpy array with shape {vectors_array.shape}", file=sys.stderr)
        except Exception as e:
            print(f"Error converting to numpy array: {e}", file=sys.stderr)
            # More detailed debug information
            print(f"Vector types: {[type(v) for v in vectors[:5]] if vectors else []}", file=sys.stderr)
            print(f"First vector sample: {vectors[0][:10] if vectors and len(vectors) > 0 and hasattr(vectors[0], '__getitem__') else 'empty'}", file=sys.stderr)
            # Try different approach for handling potential format issues
            try:
                print("Attempting alternative conversion approach...", file=sys.stderr)
                # Ensure we're working with proper float values
                cleaned_vectors = [[float(val) for val in vector] for vector in vectors]
                vectors_array = np.array(cleaned_vectors, dtype=np.float32)
                print(f"Alternative conversion successful with shape {vectors_array.shape}", file=sys.stderr)
            except Exception as nested_e:
                print(f"Alternative conversion also failed: {nested_e}", file=sys.stderr)
                # Fall back to saving as JSON
                print("Falling back to JSON format", file=sys.stderr)
                json_path = args.output.replace('.npy', '.json')
                with open(json_path, 'w') as f:
                    json.dump(vectors, f)
                result = {
                    "status": "warning",
                    "message": "NumPy conversion failed, falling back to JSON",
                    "output_path": json_path,
                    "error": str(e),
                    "nested_error": str(nested_e)
                }
                print(json.dumps(result, indent=2))
                sys.exit(0)

        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(args.output), exist_ok=True)

        # Save numpy array
        try:
            # Make sure output path has .npy extension
            output_path = args.output
            if not output_path.endswith('.npy'):
                output_path = output_path + '.npy'
                
            # Create a backup of the vectors as JSON in case numpy fails
            json_backup_path = args.output.replace('.npy', '.json')
            with open(json_backup_path, 'w') as json_backup:
                json.dump(vectors, json_backup)
                
            # Now save as numpy array
            print(f"About to save NumPy array to {output_path} (type: {type(vectors_array)}, shape: {vectors_array.shape})", file=sys.stderr)
            np.save(output_path, vectors_array)
            print(f"Successfully saved NumPy array to {output_path}", file=sys.stderr)
            # Double-check file exists
            if os.path.exists(output_path):
                print(f"Verified NPY file exists at {output_path}, size: {os.path.getsize(output_path)} bytes", file=sys.stderr)
            else:
                print(f"WARNING: NPY file was not created at {output_path}!", file=sys.stderr)
            
            # Verify the file was created
            if not os.path.exists(output_path):
                raise FileNotFoundError(f"NumPy file was not created at {output_path}")
                
            # Get file size for verification
            file_size = os.path.getsize(output_path)
            
            # Print success message as JSON
            result = {
                "status": "success",
                "output_path": output_path,
                "shape": list(vectors_array.shape),
                "dtype": str(vectors_array.dtype),
                "file_size_bytes": file_size,
                "json_backup": json_backup_path
            }
            print(json.dumps(result, indent=2))
            sys.exit(0)
        except Exception as save_error:
            error_msg = {
                "status": "error",
                "error": f"Failed to save NumPy file: {str(save_error)}",
                "json_backup": json_backup_path if 'json_backup_path' in locals() else None
            }
            print(json.dumps(error_msg, indent=2), file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        error_msg = {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_msg, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()