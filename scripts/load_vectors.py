#!/usr/bin/env python3

import argparse
import json
import numpy as np
import os
import sys
import traceback

def main():
    parser = argparse.ArgumentParser(description='Load vectors from .npy file and save as JSON')
    parser.add_argument('--input', type=str, required=True, help='Path to .npy file containing vectors')
    parser.add_argument('--output', type=str, required=True, help='Output path for JSON file')
    args = parser.parse_args()

    try:
        # Check if input is a .npy file or a .json file
        input_path = args.input
        if not os.path.exists(input_path):
            # Try alternative extensions
            if input_path.endswith('.npy') and os.path.exists(input_path.replace('.npy', '.json')):
                print(f"NPY file not found, using JSON backup file instead", file=sys.stderr)
                input_path = input_path.replace('.npy', '.json')
                
                # Load directly from JSON
                with open(input_path, 'r') as f:
                    vectors_list = json.load(f)
                    print(f"Loaded JSON data directly with {len(vectors_list)} entries", file=sys.stderr)
                    
                # Create output directory if it doesn't exist
                os.makedirs(os.path.dirname(args.output), exist_ok=True)
                
                # Save as JSON (pass-through)
                with open(args.output, 'w') as f:
                    json.dump(vectors_list, f)
                    
                # Print success message as JSON
                result = {
                    "status": "success",
                    "output_path": args.output,
                    "shape": [len(vectors_list), len(vectors_list[0]) if vectors_list and len(vectors_list) > 0 else 0],
                    "dtype": "json",
                    "note": "Used JSON backup instead of NPY"
                }
                print(json.dumps(result, indent=2))
                sys.exit(0)
            else:
                raise FileNotFoundError(f"Vector file not found at {args.input}")
        
        # If it's a JSON file, load it directly
        if input_path.endswith('.json'):
            print(f"Loading vectors from JSON format", file=sys.stderr)
            with open(input_path, 'r') as f:
                vectors_list = json.load(f)
                print(f"Loaded JSON data with {len(vectors_list)} entries", file=sys.stderr)
                
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(args.output), exist_ok=True)
            
            # Save as JSON (pass-through)
            with open(args.output, 'w') as f:
                json.dump(vectors_list, f)
                
            # Print success message as JSON
            result = {
                "status": "success",
                "output_path": args.output,
                "shape": [len(vectors_list), len(vectors_list[0]) if vectors_list and len(vectors_list) > 0 else 0],
                "dtype": "json",
                "note": "Used JSON format"
            }
            print(json.dumps(result, indent=2))
            sys.exit(0)
        
        # Normal case: load from .npy
        print(f"Loading vectors from {input_path}", file=sys.stderr)
        try:
            vectors = np.load(input_path)
            print(f"Loaded numpy array with shape {vectors.shape}", file=sys.stderr)
        except Exception as np_error:
            print(f"Error loading numpy array: {np_error}", file=sys.stderr)
            # Try JSON backup
            json_path = input_path.replace('.npy', '.json')
            if os.path.exists(json_path):
                print(f"Falling back to JSON backup at {json_path}", file=sys.stderr)
                with open(json_path, 'r') as f:
                    vectors_list = json.load(f)
                    
                # Create output directory if it doesn't exist
                os.makedirs(os.path.dirname(args.output), exist_ok=True)
                
                # Save as JSON
                with open(args.output, 'w') as f:
                    json.dump(vectors_list, f)
                    
                # Print success message as JSON
                result = {
                    "status": "warning",
                    "message": "NPY loading failed, used JSON backup",
                    "output_path": args.output,
                    "error": str(np_error)
                }
                print(json.dumps(result, indent=2))
                sys.exit(0)
            else:
                raise np_error

        # Convert to list for JSON serialization
        vectors_list = vectors.tolist()
        print(f"Converted to list format", file=sys.stderr)

        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(args.output), exist_ok=True)

        # Save as JSON
        with open(args.output, 'w') as f:
            json.dump(vectors_list, f)

        # Print success message as JSON
        result = {
            "status": "success",
            "output_path": args.output,
            "shape": list(vectors.shape),
            "dtype": str(vectors.dtype)
        }
        print(json.dumps(result, indent=2))
        sys.exit(0)

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