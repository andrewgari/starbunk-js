#!/bin/bash

# Script to build Docker images with optimized settings

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Parse command line arguments
BUILD_TYPE="all"
if [ $# -gt 0 ]; then
  BUILD_TYPE=$1
fi

echo "Building Docker images with optimized settings..."

# Function to build an image with progress and timing
build_image() {
  local image_type=$1
  local dockerfile=$2
  local tag=$3

  echo "Building $image_type image..."
  time docker build \
    --file $dockerfile \
    --tag $tag \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --progress=plain \
    --no-cache=false \
    .

  echo "$image_type image built successfully!"
}

# Build production image
build_prod() {
  build_image "Production" "Dockerfile" "starbunk-js:latest"
}

# Build development image
build_dev() {
  build_image "Development" "Dockerfile.dev" "starbunk-js:dev"
}

# Build Cypress image
build_cypress() {
  build_image "Cypress" "Dockerfile.cypress" "starbunk-cypress:latest"
}

# Build images based on the specified type
case $BUILD_TYPE in
  "prod")
    build_prod
    ;;
  "dev")
    build_dev
    ;;
  "cypress")
    build_cypress
    ;;
  "all")
    build_prod
    build_dev
    build_cypress
    ;;
  *)
    echo "Unknown build type: $BUILD_TYPE"
    echo "Usage: $0 [prod|dev|cypress|all]"
    exit 1
    ;;
esac

echo "Docker build completed successfully!"
