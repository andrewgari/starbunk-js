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
                file_size = os.path.getsize(args.vectors)
                print(f"Loaded vectors from {args.vectors}, found {len(vectors)} entries, file size: {file_size} bytes", file=sys.stderr)
                # Debug: print first vector dimensions and values
                if vectors and len(vectors) > 0:
                    first_vec = vectors[0]
                    first_vec_len = len(first_vec) if hasattr(first_vec, '__len__') else 'N/A'
                    print(f"First vector dimensions: {first_vec_len}", file=sys.stderr)
                    if hasattr(first_vec, '__getitem__'):
                        print(f"First vector sample values: {first_vec[:5]}", file=sys.stderr)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON at line {e.lineno}, column {e.colno}, position {e.pos}: {e.msg}", file=sys.stderr)
                sys.exit(1)

        # Validate vectors format
        if not isinstance(vectors, list):
            print(f"Error: Expected list of vectors, got {type(vectors)}", file=sys.stderr)
            sys.exit(1)

        # Convert to numpy array
        try:
            # Debug data before conversion
            start_time = __import__('time').time()
            print(f"Starting numpy conversion of {len(vectors)} vectors", file=sys.stderr)
            if vectors and len(vectors) > 0:
                print(f"First vector type: {type(vectors[0])}", file=sys.stderr)
                if hasattr(vectors[0], '__len__'):
                    print(f"First vector shape: {len(vectors[0])}", file=sys.stderr)
                if hasattr(vectors[0], '__iter__'):
                    elem_types = set(type(x) for x in vectors[0][:10] if x is not None)
                    print(f"First vector element types: {elem_types}", file=sys.stderr)
            
            # Handle both list of lists and direct embedding format
            vectors_array = np.array(vectors, dtype=np.float32)
            conversion_time = __import__('time').time() - start_time
            
            print(f"Converted to numpy array in {conversion_time:.2f}s with shape {vectors_array.shape} and dtype {vectors_array.dtype}", file=sys.stderr)
            
            # Debug the result
            if vectors_array.size > 0:
                print(f"Array stats - min: {vectors_array.min()}, max: {vectors_array.max()}, mean: {vectors_array.mean()}", file=sys.stderr)
                print(f"First few values: {vectors_array.flatten()[:5]}", file=sys.stderr)
                
            # Check for NaN or Inf values
            nan_count = np.isnan(vectors_array).sum()
            inf_count = np.isinf(vectors_array).sum()
            if nan_count > 0 or inf_count > 0:
                print(f"WARNING: Array contains {nan_count} NaN values and {inf_count} Inf values", file=sys.stderr)
                
        except Exception as e:
            print(f"Error converting to numpy array: {e}", file=sys.stderr)
            # More detailed debug information
            print(f"Vector types: {[type(v) for v in vectors[:5]] if vectors else []}", file=sys.stderr)
            print(f"First vector sample: {vectors[0][:10] if vectors and len(vectors) > 0 and hasattr(vectors[0], '__getitem__') else 'empty'}", file=sys.stderr)
            
            # Try different approach for handling potential format issues
            try:
                print("Attempting alternative conversion approach...", file=sys.stderr)
                start_time = __import__('time').time()
                
                # Ensure we're working with proper float values
                cleaned_vectors = [[float(val) for val in vector] for vector in vectors]
                vectors_array = np.array(cleaned_vectors, dtype=np.float32)
                
                conversion_time = __import__('time').time() - start_time
                print(f"Alternative conversion successful in {conversion_time:.2f}s with shape {vectors_array.shape}", file=sys.stderr)
                
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
            print(f"About to save NumPy array to {output_path} (type: {type(vectors_array)}, shape: {vectors_array.shape}, dtype: {vectors_array.dtype})", file=sys.stderr)
            
            # Calculate memory usage
            mem_size_bytes = vectors_array.nbytes
            mem_size_mb = mem_size_bytes / (1024 * 1024)
            print(f"NumPy array memory usage: {mem_size_bytes} bytes ({mem_size_mb:.2f} MB)", file=sys.stderr)
            
            # Save with timing
            save_start = __import__('time').time()
            np.save(output_path, vectors_array)
            save_time = __import__('time').time() - save_start
            
            print(f"Successfully saved NumPy array to {output_path} in {save_time:.2f}s", file=sys.stderr)
            
            # Double-check file exists and get details
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                file_size_mb = file_size / (1024 * 1024)
                print(f"Verified NPY file at {output_path}:", file=sys.stderr)
                print(f"  - Size: {file_size} bytes ({file_size_mb:.2f} MB)", file=sys.stderr)
                print(f"  - Compression ratio: {file_size / mem_size_bytes:.2f}x", file=sys.stderr)
                
                # Read back the file to verify content is as expected
                try:
                    verify_start = __import__('time').time()
                    verification_array = np.load(output_path)
                    verify_time = __import__('time').time() - verify_start
                    
                    # Compare shapes and values
                    shapes_match = verification_array.shape == vectors_array.shape
                    if shapes_match and verification_array.size > 0:
                        # Check a sample of values match
                        sample_idx = min(100, verification_array.size - 1)
                        values_match = np.allclose(
                            verification_array.flatten()[:sample_idx],
                            vectors_array.flatten()[:sample_idx],
                            rtol=1e-5, atol=1e-8
                        )
                        print(f"  - Verification: Shape match: {shapes_match}, Values match: {values_match}", file=sys.stderr)
                        print(f"  - Read back in {verify_time:.2f}s", file=sys.stderr)
                    else:
                        print(f"  - WARNING: Verification failed, shapes match: {shapes_match}", file=sys.stderr)
                        
                except Exception as verify_error:
                    print(f"  - WARNING: Verification failed: {verify_error}", file=sys.stderr)
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