#!/bin/bash

# Live Fleet Tracking System - Backend Setup Script
# This script initializes and configures the backend services

# Requirement: Core Backend Services Setup - Enable strict error handling
set -e
set -o pipefail

# Setup logging
LOG_FILE="setup.log"
exec 1> >(tee -a "$LOG_FILE") 2>&1

# Requirement: Development Environment - Timestamp function for logging
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Requirement: Core Backend Services Setup - Error handling function
handle_error() {
    local line_no=$1
    local error_code=$2
    echo "$(timestamp) [ERROR] Script failed at line ${line_no} with error code ${error_code}"
    exit "${error_code}"
}

trap 'handle_error ${LINENO} $?' ERR

# Requirement: Core Backend Services Setup - Check prerequisites function
check_prerequisites() {
    echo "$(timestamp) [INFO] Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo "$(timestamp) [ERROR] Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
        echo "$(timestamp) [ERROR] Node.js version must be >= 18.0.0"
        exit 1
    fi
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        echo "$(timestamp) [ERROR] npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    if [ "$(printf '%s\n' "8.0.0" "$NPM_VERSION" | sort -V | head -n1)" != "8.0.0" ]; then
        echo "$(timestamp) [ERROR] npm version must be >= 8.0.0"
        exit 1
    }
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        echo "$(timestamp) [ERROR] Python 3 is not installed"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2)
    if [ "$(printf '%s\n' "3.11" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.11" ]; then
        echo "$(timestamp) [ERROR] Python version must be >= 3.11"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "$(timestamp) [ERROR] Docker is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo "$(timestamp) [ERROR] Docker daemon is not running"
        exit 1
    fi
    
    # Check required ports
    for port in 3000 5432 27017 6379 9090; do
        if lsof -Pi :$port -sTCP:LISTEN -t &> /dev/null; then
            echo "$(timestamp) [ERROR] Port $port is already in use"
            exit 1
        fi
    done
    
    # Check disk space (minimum 10GB required)
    AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | cut -d'G' -f1)
    if [ "$AVAILABLE_SPACE" -lt 10 ]; then
        echo "$(timestamp) [ERROR] Insufficient disk space. At least 10GB required"
        exit 1
    fi
    
    echo "$(timestamp) [INFO] All prerequisites checked successfully"
}

# Requirement: Development Environment - Setup environment function
setup_environment() {
    echo "$(timestamp) [INFO] Setting up environment..."
    
    # Copy environment file if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        
        # Generate secure random secrets
        JWT_SECRET=$(openssl rand -hex 32)
        REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
        ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
        
        # Update secrets in .env file
        sed -i "s/your_jwt_secret/$JWT_SECRET/" .env
        sed -i "s/your_refresh_token_secret/$REFRESH_TOKEN_SECRET/" .env
        sed -i "s/your_access_token_secret/$ACCESS_TOKEN_SECRET/" .env
        
        echo "$(timestamp) [INFO] Environment file created with secure secrets"
    fi
}

# Requirement: Core Backend Services Setup - Install dependencies function
install_dependencies() {
    echo "$(timestamp) [INFO] Installing dependencies..."
    
    # Install Node.js dependencies
    npm ci
    
    # Install global development tools
    npm install -g typescript@5.0.0 nodemon@2.0.21
    
    # Install Python dependencies
    pip3 install -r requirements.txt
    
    # Build TypeScript project
    npm run build
    
    echo "$(timestamp) [INFO] Dependencies installed successfully"
}

# Requirement: Database Configuration - Initialize databases function
initialize_databases() {
    echo "$(timestamp) [INFO] Initializing databases..."
    
    # Start PostgreSQL container
    docker run -d \
        --name fleet-postgres \
        -e POSTGRES_DB=fleet_tracker \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=your_password \
        -v fleet-postgres-data:/var/lib/postgresql/data \
        -p 5432:5432 \
        postgres:14-alpine
    
    # Wait for PostgreSQL to be ready
    until docker exec fleet-postgres pg_isready; do
        echo "$(timestamp) [INFO] Waiting for PostgreSQL to be ready..."
        sleep 2
    done
    
    # Start MongoDB container with replica set
    docker run -d \
        --name fleet-mongodb \
        -e MONGO_INITDB_ROOT_USERNAME=mongodb \
        -e MONGO_INITDB_ROOT_PASSWORD=your_password \
        -v fleet-mongodb-data:/data/db \
        -p 27017:27017 \
        mongo:latest --replSet rs0
    
    # Initialize MongoDB replica set
    sleep 5
    docker exec fleet-mongodb mongosh --eval 'rs.initiate()'
    
    # Start Redis container
    docker run -d \
        --name fleet-redis \
        -p 6379:6379 \
        -v fleet-redis-data:/data \
        redis:alpine --appendonly yes
    
    echo "$(timestamp) [INFO] Running database migrations..."
    npm run migrate
    
    echo "$(timestamp) [INFO] Databases initialized successfully"
}

# Requirement: Development Environment - Setup development tools function
setup_development_tools() {
    echo "$(timestamp) [INFO] Setting up development tools..."
    
    # Configure ESLint
    npm run lint -- --init
    
    # Setup Jest testing environment
    mkdir -p tests/unit tests/integration tests/e2e
    
    # Configure VS Code debugging
    mkdir -p .vscode
    cat > .vscode/launch.json << EOF
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Program",
            "skipFiles": ["<node_internals>/**"],
            "program": "\${workspaceFolder}/src/index.ts",
            "preLaunchTask": "tsc: build - tsconfig.json",
            "outFiles": ["\${workspaceFolder}/dist/**/*.js"]
        }
    ]
}
EOF
    
    echo "$(timestamp) [INFO] Development tools setup completed"
}

# Main execution
echo "$(timestamp) [INFO] Starting backend setup..."

check_prerequisites
setup_environment
install_dependencies
initialize_databases
setup_development_tools

echo "$(timestamp) [INFO] Backend setup completed successfully"