#!/bin/bash

# Human Tasks:
# 1. Ensure Node.js 16+ and npm 8+ are installed
# 2. Configure proper environment variables in .env file
# 3. Set up SSL certificates for production domains
# 4. Configure Google Maps API key with proper restrictions
# 5. Set up proper JWT token storage with secure prefix
# 6. Review and adjust memory allocation based on build requirements

# REQ-4.4.1: Web Dashboard - Build process for React 18-based web application
# REQ-1.2: Production Requirements - Ensures production-ready build with optimizations
# REQ-8: Security Requirements - Implements secure environment handling

# Exit on any error
set -e

# Script constants
MIN_NODE_VERSION="16.0.0"
MIN_MEMORY="4096" # 4GB minimum memory requirement
BUILD_DIR="build"
ENV_FILE=".env"
ENV_EXAMPLE_FILE=".env.example"
REQUIRED_ENV_VARS=(
    "REACT_APP_API_BASE_URL"
    "REACT_APP_ENVIRONMENT"
    "REACT_APP_GOOGLE_MAPS_API_KEY"
)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# REQ-8: Security Requirements - Environment validation
check_environment() {
    log_info "Checking environment configuration..."

    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE_FILE" ]; then
            log_error "No .env file found. Please copy $ENV_EXAMPLE_FILE to $ENV_FILE and configure it."
        else
            log_error "No .env file found and no $ENV_EXAMPLE_FILE template available."
        fi
        exit 1
    fi

    # Source the .env file
    set -a
    source "$ENV_FILE"
    set +a

    # Check required environment variables
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done

    # Validate environment-specific settings
    if [ "$REACT_APP_ENVIRONMENT" = "production" ]; then
        if [[ "$REACT_APP_API_BASE_URL" != https://* ]]; then
            log_error "Production API URL must use HTTPS"
            exit 1
        fi
        
        if [ ${#REACT_APP_GOOGLE_MAPS_API_KEY} -lt 20 ]; then
            log_error "Invalid Google Maps API key format"
            exit 1
        fi
    fi

    log_info "Environment validation completed successfully"
    return 0
}

# REQ-1.2: Production Requirements - System requirements check
check_system_requirements() {
    log_info "Checking system requirements..."

    # Check Node.js version
    if ! command_exists node; then
        log_error "Node.js is not installed"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    if version_gt "$MIN_NODE_VERSION" "$NODE_VERSION"; then
        log_error "Node.js version must be $MIN_NODE_VERSION or higher (current: $NODE_VERSION)"
        exit 1
    fi

    # Check available memory
    if command_exists free; then
        AVAILABLE_MEMORY=$(free -m | awk '/Mem:/ {print $2}')
        if [ "$AVAILABLE_MEMORY" -lt "$MIN_MEMORY" ]; then
            log_warn "Less than ${MIN_MEMORY}MB of memory available. Build performance may be affected."
        fi
    fi

    # Check disk space
    REQUIRED_SPACE=2048 # 2GB minimum free space
    FREE_SPACE=$(df -m . | awk 'NR==2 {print $4}')
    if [ "$FREE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log_error "Insufficient disk space. At least ${REQUIRED_SPACE}MB required."
        exit 1
    fi

    log_info "System requirements check completed"
    return 0
}

# REQ-1.2: Production Requirements - Build cleanup
clean_build() {
    log_info "Cleaning previous build artifacts..."

    # Remove existing build directory
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        if [ $? -ne 0 ]; then
            log_error "Failed to remove existing build directory"
            exit 1
        fi
    fi

    # Clean npm cache if needed
    if [ "$REACT_APP_ENVIRONMENT" = "production" ]; then
        npm cache clean --force
        if [ $? -ne 0 ]; then
            log_warn "Failed to clean npm cache. Continuing anyway..."
        fi
    fi

    log_info "Build cleanup completed"
    return 0
}

# REQ-4.4.1: Web Dashboard - Production build execution
build_application() {
    log_info "Starting production build process..."

    # Set production environment
    export NODE_ENV=production

    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false
    if [ $? -ne 0 ]; then
        log_error "Failed to install dependencies"
        exit 1
    fi

    # TypeScript type checking
    log_info "Running TypeScript compilation..."
    npm run tsc --noEmit
    if [ $? -ne 0 ]; then
        log_error "TypeScript compilation failed"
        exit 1
    }

    # Production build with optimizations
    log_info "Creating optimized production build..."
    GENERATE_SOURCEMAP=false \
    INLINE_RUNTIME_CHUNK=false \
    npm run build
    if [ $? -ne 0 ]; then
        log_error "Production build failed"
        exit 1
    fi

    # Verify build output
    if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "Build directory is missing or incomplete"
        exit 1
    fi

    # Create build manifest
    create_build_manifest

    log_info "Production build completed successfully"
    return 0
}

# Create build manifest for deployment tracking
create_build_manifest() {
    MANIFEST_FILE="$BUILD_DIR/build-manifest.json"
    
    cat > "$MANIFEST_FILE" << EOF
{
    "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "nodeVersion": "$(node -v)",
    "environment": "${REACT_APP_ENVIRONMENT}",
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF
}

# Main execution flow
main() {
    log_info "Starting build process for Fleet Tracker Web Dashboard..."
    
    # Run all checks and build steps
    check_environment
    check_system_requirements
    clean_build
    build_application
    
    log_info "Build process completed successfully!"
    return 0
}

# Execute main function
main "$@"