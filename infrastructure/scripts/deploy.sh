#!/bin/bash

# Human Tasks:
# 1. Configure AWS credentials with appropriate permissions for infrastructure deployment
# 2. Set up Terraform backend state configuration in AWS S3
# 3. Configure kubectl context with proper cluster access
# 4. Set up required environment variables in CI/CD pipeline
# 5. Configure monitoring alert endpoints (email, Slack)
# 6. Review and adjust resource quotas based on environment
# 7. Set up external DNS and SSL certificates if required

# Required tool versions:
# - terraform v1.0.0+
# - kubectl v1.24+
# - aws-cli v2.0+
# - helm v3.0+

set -euo pipefail

# Global variables from specification
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-west-2}"
PROJECT_NAME="fleet-tracking"
TERRAFORM_DIR="../terraform"
KUBERNETES_DIR="../kubernetes"
LOG_DIR="/var/log/fleet-tracking"

# Source dependent scripts
source ./monitoring-setup.sh
source ./security-setup.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging setup
setup_logging() {
    # Create log directory if it doesn't exist
    if [ ! -d "$LOG_DIR" ]; then
        sudo mkdir -p "$LOG_DIR"
        sudo chmod 755 "$LOG_DIR"
    fi
    
    # Set up log file
    LOG_FILE="${LOG_DIR}/deploy-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2>&1
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting deployment for environment: $ENVIRONMENT"
}

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Requirement: Infrastructure Deployment (4.7 Deployment Architecture)
# Function to deploy cloud infrastructure using Terraform
deploy_infrastructure() {
    local environment="$1"
    log "Deploying infrastructure for environment: $environment"
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log "Initializing Terraform..."
    if ! terraform init; then
        error "Terraform initialization failed"
        return 1
    fi
    
    # Select workspace
    log "Selecting Terraform workspace: $environment"
    if ! terraform workspace select "$environment" 2>/dev/null; then
        terraform workspace new "$environment"
    fi
    
    # Plan Terraform changes
    log "Planning Terraform changes..."
    if ! terraform plan -detailed-exitcode -out=tfplan; then
        error "Terraform plan failed"
        return 1
    fi
    
    # Apply Terraform changes
    log "Applying Terraform changes..."
    if [ "$environment" != "prod" ]; then
        terraform apply -auto-approve tfplan
    else
        terraform apply tfplan
    fi
    
    # Update kubeconfig
    log "Updating kubeconfig..."
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "${PROJECT_NAME}-${environment}" \
        --alias "${PROJECT_NAME}-${environment}"
    
    log "Infrastructure deployment completed successfully"
    return 0
}

# Requirement: System Components (4.1 High-Level Architecture Overview)
# Function to deploy Kubernetes resources
deploy_kubernetes_resources() {
    local environment="$1"
    log "Deploying Kubernetes resources for environment: $environment"
    
    # Configure kubectl context
    kubectl config use-context "${PROJECT_NAME}-${environment}"
    
    # Create namespaces
    log "Creating namespaces..."
    kubectl apply -f "$KUBERNETES_DIR/namespaces/${environment}.yaml"
    
    # Apply ConfigMaps and Secrets
    log "Applying ConfigMaps and Secrets..."
    kubectl apply -f "$KUBERNETES_DIR/config/" -R
    
    # Deploy core services
    log "Deploying core services..."
    local services=("location" "fleet" "route" "analytics")
    for service in "${services[@]}"; do
        kubectl apply -f "$KUBERNETES_DIR/services/${service}/" -R
    done
    
    # Deploy database resources
    log "Deploying database resources..."
    kubectl apply -f "$KUBERNETES_DIR/storage/" -R
    
    # Configure service mesh and ingress
    log "Configuring service mesh and ingress..."
    kubectl apply -f "$KUBERNETES_DIR/ingress/" -R
    
    # Verify deployments
    log "Verifying service deployments..."
    for service in "${services[@]}"; do
        kubectl wait --for=condition=available --timeout=300s \
            deployment/${service}-service -n "${PROJECT_NAME}"
    done
    
    log "Kubernetes resources deployed successfully"
    return 0
}

# Requirement: Performance Requirements (1.2 Scope/Performance Requirements)
# Function to set up monitoring and security
setup_monitoring_and_security() {
    log "Setting up monitoring and security components..."
    
    # Set up monitoring stack
    if ! setup_monitoring; then
        error "Monitoring setup failed"
        return 3
    fi
    
    # Set up security components
    if ! setup_network_policies; then
        error "Network policies setup failed"
        return 4
    fi
    
    if ! setup_rbac; then
        error "RBAC setup failed"
        return 4
    fi
    
    if ! setup_pod_security_policies; then
        error "Pod security policies setup failed"
        return 4
    fi
    
    if ! verify_security_setup; then
        error "Security verification failed"
        return 4
    fi
    
    log "Monitoring and security setup completed successfully"
    return 0
}

# Requirement: Performance Requirements (1.2 Scope/Performance Requirements)
# Function to verify deployment
verify_deployment() {
    log "Verifying deployment..."
    local status=0
    
    # Check AWS infrastructure
    log "Checking AWS infrastructure..."
    if ! aws eks describe-cluster \
        --name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" &>/dev/null; then
        error "EKS cluster verification failed"
        status=1
    fi
    
    # Verify Kubernetes services
    log "Verifying Kubernetes services..."
    local services=("location" "fleet" "route" "analytics")
    for service in "${services[@]}"; do
        if ! kubectl get service "${service}-service" \
            -n "${PROJECT_NAME}" &>/dev/null; then
            error "Service ${service}-service verification failed"
            status=1
        fi
    done
    
    # Check monitoring stack
    log "Checking monitoring stack..."
    if ! kubectl get pods -n monitoring \
        -l app=prometheus &>/dev/null; then
        error "Prometheus verification failed"
        status=1
    fi
    
    if ! kubectl get pods -n monitoring \
        -l app.kubernetes.io/name=grafana &>/dev/null; then
        error "Grafana verification failed"
        status=1
    fi
    
    # Verify database connectivity
    log "Checking database connectivity..."
    if ! kubectl get pods -n "${PROJECT_NAME}" \
        -l app=postgresql &>/dev/null; then
        error "PostgreSQL verification failed"
        status=1
    fi
    
    if ! kubectl get pods -n "${PROJECT_NAME}" \
        -l app=mongodb &>/dev/null; then
        error "MongoDB verification failed"
        status=1
    fi
    
    # Run basic integration tests
    log "Running integration tests..."
    if [ -f "./tests/integration/run.sh" ]; then
        if ! ./tests/integration/run.sh; then
            error "Integration tests failed"
            status=1
        fi
    else
        warn "Integration tests script not found"
    fi
    
    if [ $status -eq 0 ]; then
        log "Deployment verification completed successfully"
    else
        error "Deployment verification failed"
    fi
    return $status
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --region)
                AWS_REGION="$2"
                shift 2
                ;;
            --skip-terraform)
                SKIP_TERRAFORM=true
                shift
                ;;
            --skip-kubernetes)
                SKIP_KUBERNETES=true
                shift
                ;;
            --skip-monitoring)
                SKIP_MONITORING=true
                shift
                ;;
            --skip-security)
                SKIP_SECURITY=true
                shift
                ;;
            --verbose)
                set -x
                shift
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    setup_logging
    parse_args "$@"
    
    # Deploy infrastructure
    if [ "${SKIP_TERRAFORM:-false}" != "true" ]; then
        if ! deploy_infrastructure "$ENVIRONMENT"; then
            error "Infrastructure deployment failed"
            exit 1
        fi
    fi
    
    # Deploy Kubernetes resources
    if [ "${SKIP_KUBERNETES:-false}" != "true" ]; then
        if ! deploy_kubernetes_resources "$ENVIRONMENT"; then
            error "Kubernetes deployment failed"
            exit 2
        fi
    fi
    
    # Setup monitoring and security
    if [ "${SKIP_MONITORING:-false}" != "true" ] || \
       [ "${SKIP_SECURITY:-false}" != "true" ]; then
        if ! setup_monitoring_and_security; then
            error "Monitoring and security setup failed"
            exit 3
        fi
    fi
    
    # Verify deployment
    if ! verify_deployment; then
        error "Deployment verification failed"
        exit 5
    fi
    
    log "Deployment completed successfully"
    return 0
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi