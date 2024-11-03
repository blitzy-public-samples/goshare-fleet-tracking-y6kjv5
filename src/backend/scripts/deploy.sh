#!/bin/bash

# Live Fleet Tracking System - Deployment Script
# Human Tasks:
# 1. Configure AWS credentials and ECR access
# 2. Set up Kubernetes cluster access and context
# 3. Configure environment-specific secrets in AWS Secrets Manager
# 4. Set up monitoring and logging agents
# 5. Configure SSL certificates for domains
# 6. Set up backup retention policies

# Requirement: Deployment Architecture - Enable strict error handling
set -e
set -o pipefail

# Source setup script for environment validation functions
source ./setup.sh

# Requirement: CI/CD Pipeline - Global variables and configurations
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="deployment-${TIMESTAMP}.log"
AWS_REGION="us-east-1"
ECR_REGISTRY="your-account.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${TIMESTAMP}"

# Requirement: Deployment Architecture - Environment-specific configurations
declare -A ENVIRONMENTS=(
    ["development"]="dev-cluster:fleet-tracking-dev:1:500m:512Mi"
    ["staging"]="staging-cluster:fleet-tracking-staging:2:1000m:1Gi"
    ["production"]="prod-cluster:fleet-tracking-prod:3:2000m:2Gi"
)

# Requirement: CI/CD Pipeline - Logging configuration
exec 1> >(tee -a "$LOG_FILE") 2>&1

# Requirement: Deployment Architecture - Error handling function
handle_error() {
    local exit_code=$?
    echo "[ERROR] Deployment failed at line $1 with exit code $exit_code"
    # Requirement: Container Orchestration - Rollback on failure
    if [ -n "${PREVIOUS_DEPLOYMENT}" ]; then
        echo "[INFO] Rolling back to previous deployment..."
        kubectl rollout undo deployment/backend-services -n "${NAMESPACE}"
    fi
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# Requirement: Deployment Architecture - Environment validation
check_environment() {
    local env=$1
    echo "[INFO] Validating environment: $env"

    # Validate environment exists
    if [[ ! ${ENVIRONMENTS[$env]} ]]; then
        echo "[ERROR] Invalid environment: $env"
        exit 1
    }

    # Parse environment configuration
    IFS=':' read -r CLUSTER NAMESPACE REPLICAS CPU_LIMIT MEMORY_LIMIT <<< "${ENVIRONMENTS[$env]}"

    # Requirement: Container Orchestration - Validate cluster access
    kubectl config use-context "$CLUSTER"
    if ! kubectl auth can-i get deployments -n "$NAMESPACE"; then
        echo "[ERROR] Insufficient permissions for namespace: $NAMESPACE"
        exit 2
    }

    # Check required tools
    check_prerequisites

    # Verify AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "[ERROR] Invalid AWS credentials"
        exit 2
    }

    # Verify ECR login
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${ECR_REGISTRY}"

    echo "[INFO] Environment validation completed successfully"
}

# Requirement: CI/CD Pipeline - Build Docker images
build_images() {
    local version_tag=$1
    echo "[INFO] Building Docker images with tag: $version_tag"

    # Build API service image
    docker build -f Dockerfile \
        --target production \
        --build-arg NODE_ENV=production \
        --build-arg VERSION="${version_tag}" \
        -t "${ECR_REGISTRY}/fleet-tracker-api:${version_tag}" \
        -t "${ECR_REGISTRY}/fleet-tracker-api:latest" .

    # Build Analytics service image
    docker build -f Dockerfile.analytics \
        --target production \
        --build-arg PYTHON_ENV=production \
        --build-arg VERSION="${version_tag}" \
        -t "${ECR_REGISTRY}/fleet-tracker-analytics:${version_tag}" \
        -t "${ECR_REGISTRY}/fleet-tracker-analytics:latest" .

    # Run security scans
    echo "[INFO] Running security scans on images..."
    docker scan "${ECR_REGISTRY}/fleet-tracker-api:${version_tag}"
    docker scan "${ECR_REGISTRY}/fleet-tracker-analytics:${version_tag}"

    # Push images to ECR
    echo "[INFO] Pushing images to ECR..."
    docker push "${ECR_REGISTRY}/fleet-tracker-api:${version_tag}"
    docker push "${ECR_REGISTRY}/fleet-tracker-api:latest"
    docker push "${ECR_REGISTRY}/fleet-tracker-analytics:${version_tag}"
    docker push "${ECR_REGISTRY}/fleet-tracker-analytics:latest"

    # Verify image digests
    aws ecr describe-images \
        --repository-name fleet-tracker-api \
        --image-ids imageTag="${version_tag}"
    aws ecr describe-images \
        --repository-name fleet-tracker-analytics \
        --image-ids imageTag="${version_tag}"
}

# Requirement: Container Orchestration - Deploy services to Kubernetes
deploy_services() {
    local environment=$1
    local version=$2
    echo "[INFO] Deploying services to environment: $environment"

    # Store current deployment for potential rollback
    PREVIOUS_DEPLOYMENT=$(kubectl get deployment backend-services -n "${NAMESPACE}" -o json)

    # Apply namespace configurations
    kubectl apply -f "../kubernetes/namespaces/${environment}.yaml"

    # Update deployment configuration with new image versions
    yq eval ".spec.template.spec.containers[0].image = \"${ECR_REGISTRY}/fleet-tracker-api:${version}\"" \
        -i "../kubernetes/deployment.yaml"
    yq eval ".spec.template.spec.containers[1].image = \"${ECR_REGISTRY}/fleet-tracker-analytics:${version}\"" \
        -i "../kubernetes/deployment.yaml"

    # Apply resource quotas based on environment
    yq eval ".spec.template.spec.containers[].resources.limits.cpu = \"${CPU_LIMIT}\"" \
        -i "../kubernetes/deployment.yaml"
    yq eval ".spec.template.spec.containers[].resources.limits.memory = \"${MEMORY_LIMIT}\"" \
        -i "../kubernetes/deployment.yaml"

    # Configure horizontal pod autoscaling
    kubectl apply -f "../kubernetes/deployment.yaml"

    # Wait for rollout with timeout
    timeout 300 kubectl rollout status deployment/backend-services -n "${NAMESPACE}"

    echo "[INFO] Deployment completed successfully"
}

# Requirement: Deployment Architecture - Verify deployment health
verify_deployment() {
    echo "[INFO] Verifying deployment health..."

    # Check pod status
    local ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -l app=fleet-tracking,component=backend \
        -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | \
        tr ' ' '\n' | grep -c "true")

    if [ "$ready_pods" -lt "$REPLICAS" ]; then
        echo "[ERROR] Not all pods are ready. Expected: $REPLICAS, Ready: $ready_pods"
        return 5
    }

    # Verify service endpoints
    kubectl get service backend-services -n "${NAMESPACE}"

    # Test health check endpoints
    local api_endpoint=$(kubectl get service backend-services -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    for i in {1..3}; do
        if ! curl -sf "http://${api_endpoint}/health"; then
            echo "[ERROR] Health check failed"
            return 5
        fi
        sleep 2
    done

    # Verify database connections
    kubectl exec -n "${NAMESPACE}" \
        "$(kubectl get pod -n "${NAMESPACE}" -l app=fleet-tracking,component=backend -o jsonpath='{.items[0].metadata.name}')" \
        -- curl -sf localhost:3000/ready

    # Check logging and monitoring setup
    kubectl logs -n "${NAMESPACE}" -l app=fleet-tracking,component=backend --tail=10

    echo "[INFO] Deployment verification completed successfully"
    return 0
}

# Main execution
main() {
    local environment=$1
    local version_tag=$2

    echo "[INFO] Starting deployment process..."
    echo "[INFO] Environment: $environment"
    echo "[INFO] Version: $version_tag"

    # Validate environment and prerequisites
    check_environment "$environment"

    # Build and push Docker images
    build_images "$version_tag"

    # Deploy services to Kubernetes
    deploy_services "$environment" "$version_tag"

    # Verify deployment health
    verify_deployment

    echo "[INFO] Deployment completed successfully"
}

# Script execution
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <environment> <version_tag>"
    echo "Environments: development, staging, production"
    exit 1
fi

main "$1" "$2"