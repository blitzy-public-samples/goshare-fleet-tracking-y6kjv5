#!/bin/bash

# REQ: Automated Deployment - Deployment script for web dashboard
# Implements requirements from section 4.7 Deployment Architecture/CI/CD Pipeline

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Global variables from specification
ENVIRONMENTS=("dev" "staging" "prod")
APP_NAME="web-dashboard"
NAMESPACE="fleet-tracking"
MANIFEST_DIR="../kubernetes"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# REQ: Multi-Environment Support - Environment validation
check_prerequisites() {
    echo "🔍 Checking deployment prerequisites..."
    
    # Check required tools
    command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}❌ kubectl is required but not installed.${NC}" >&2; exit 1; }
    command -v aws >/dev/null 2>&1 || { echo -e "${RED}❌ aws-cli is required but not installed.${NC}" >&2; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ docker is required but not installed.${NC}" >&2; exit 1; }

    # Verify Kubernetes manifests
    local required_manifests=("deployment.yaml" "service.yaml" "ingress.yaml" "configmap.yaml")
    for manifest in "${required_manifests[@]}"; do
        if [[ ! -f "${MANIFEST_DIR}/${manifest}" ]]; then
            echo -e "${RED}❌ Required manifest ${manifest} not found in ${MANIFEST_DIR}${NC}" >&2
            exit 1
        fi
    done

    # Check AWS authentication
    aws sts get-caller-identity >/dev/null 2>&1 || { echo -e "${RED}❌ AWS authentication failed${NC}" >&2; exit 1; }

    # Verify Kubernetes cluster access
    kubectl cluster-info >/dev/null 2>&1 || { echo -e "${RED}❌ Kubernetes cluster access failed${NC}" >&2; exit 1; }

    echo -e "${GREEN}✅ All prerequisites checked successfully${NC}"
    return 0
}

# REQ: Automated Deployment - Build Docker image with environment-specific configuration
build_image() {
    local environment=$1
    local version=$2
    
    echo "🏗️ Building Docker image for environment: ${environment}, version: ${version}"
    
    # Set build arguments based on environment
    local build_args=(
        "--build-arg NODE_ENV=${environment}"
        "--build-arg APP_VERSION=${version}"
        "--build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    )

    # Build optimized production React bundle
    echo "📦 Building React application..."
    docker build \
        ${build_args[@]} \
        -t "${APP_NAME}:${version}-${environment}" \
        -f Dockerfile .

    # Run security scan on built image
    echo "🔒 Running security scan on image..."
    docker scan "${APP_NAME}:${version}-${environment}" || {
        echo -e "${YELLOW}⚠️ Security vulnerabilities detected${NC}"
        read -p "Continue deployment? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }

    echo -e "${GREEN}✅ Image built successfully: ${APP_NAME}:${version}-${environment}${NC}"
    return 0
}

# REQ: Automated Deployment - Push image to Amazon ECR
push_image() {
    local image_tag=$1
    local aws_account_id=$(aws sts get-caller-identity --query Account --output text)
    local aws_region=$(aws configure get region)
    local ecr_registry="${aws_account_id}.dkr.ecr.${aws_region}.amazonaws.com"
    
    echo "📤 Pushing image to ECR: ${image_tag}"

    # Authenticate with Amazon ECR
    aws ecr get-login-password --region "${aws_region}" | \
        docker login --username AWS --password-stdin "${ecr_registry}"

    # Tag image for ECR
    docker tag "${image_tag}" "${ecr_registry}/${image_tag}"

    # Push image to ECR
    docker push "${ecr_registry}/${image_tag}"

    echo -e "${GREEN}✅ Image pushed successfully to ECR${NC}"
    echo "${ecr_registry}/${image_tag}"
    return 0
}

# REQ: Zero-Downtime Updates - Deploy to Kubernetes with rolling update strategy
deploy_kubernetes() {
    local environment=$1
    local image_uri=$2
    
    echo "🚀 Deploying to Kubernetes - Environment: ${environment}"

    # Update Kubernetes manifests with new image
    sed -i.bak "s|image:.*|image: ${image_uri}|g" "${MANIFEST_DIR}/deployment.yaml"

    # Apply ConfigMap for environment variables
    kubectl apply -f "${MANIFEST_DIR}/configmap.yaml" -n "${NAMESPACE}"

    # Apply Deployment with rolling update strategy
    echo "📦 Applying deployment..."
    kubectl apply -f "${MANIFEST_DIR}/deployment.yaml" -n "${NAMESPACE}"

    # Apply Service for load balancing
    echo "🔄 Applying service..."
    kubectl apply -f "${MANIFEST_DIR}/service.yaml" -n "${NAMESPACE}"

    # Apply Ingress with TLS configuration
    echo "🌐 Applying ingress..."
    kubectl apply -f "${MANIFEST_DIR}/ingress.yaml" -n "${NAMESPACE}"

    # Wait for rollout completion
    echo "⏳ Waiting for rollout to complete..."
    kubectl rollout status deployment/${APP_NAME} -n "${NAMESPACE}" --timeout=300s

    echo -e "${GREEN}✅ Deployment completed successfully${NC}"
    return 0
}

# REQ: Automated Deployment - Verify deployment health
verify_deployment() {
    local environment=$1
    
    echo "🔍 Verifying deployment health..."

    # Check deployment rollout status
    local deployment_status=$(kubectl rollout status deployment/${APP_NAME} -n "${NAMESPACE}" --timeout=60s)
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Deployment rollout failed${NC}"
        return 1
    fi

    # Verify pod health and readiness
    local ready_pods=$(kubectl get pods -l app=${APP_NAME} -n "${NAMESPACE}" -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | tr ' ' '\n' | grep -c "true")
    local total_pods=$(kubectl get pods -l app=${APP_NAME} -n "${NAMESPACE}" --no-headers | wc -l)
    
    if [[ ${ready_pods} -lt ${total_pods} ]]; then
        echo -e "${RED}❌ Not all pods are ready: ${ready_pods}/${total_pods}${NC}"
        return 1
    fi

    # Check service endpoints
    local service_endpoints=$(kubectl get endpoints ${APP_NAME}-service -n "${NAMESPACE}" -o jsonpath='{.subsets[*].addresses[*]}')
    if [[ -z "${service_endpoints}" ]]; then
        echo -e "${RED}❌ No service endpoints available${NC}"
        return 1
    fi

    # Validate ingress configuration and TLS
    local ingress_host=$(kubectl get ingress ${APP_NAME}-ingress -n "${NAMESPACE}" -o jsonpath='{.spec.rules[0].host}')
    if [[ -z "${ingress_host}" ]]; then
        echo -e "${RED}❌ Ingress host not configured${NC}"
        return 1
    fi

    # Test application health endpoint
    local health_status=$(kubectl exec -it $(kubectl get pods -l app=${APP_NAME} -n "${NAMESPACE}" -o jsonpath='{.items[0].metadata.name}') -n "${NAMESPACE}" -- curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
    if [[ "${health_status}" != "200" ]]; then
        echo -e "${RED}❌ Health check failed with status: ${health_status}${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Deployment verification successful${NC}"
    return 0
}

# REQ: Automated Deployment - Rollback in case of deployment failure
rollback() {
    local environment=$1
    local previous_version=$2
    
    echo -e "${YELLOW}⚠️ Initiating rollback to version: ${previous_version}${NC}"

    # Get previous deployment revision
    local previous_revision=$(kubectl rollout history deployment/${APP_NAME} -n "${NAMESPACE}" | grep ${previous_version} | awk '{print $1}')
    
    if [[ -z "${previous_revision}" ]]; then
        echo -e "${RED}❌ Previous version ${previous_version} not found in rollout history${NC}"
        return 1
    }

    # Perform rollback
    kubectl rollout undo deployment/${APP_NAME} -n "${NAMESPACE}" --to-revision=${previous_revision}

    # Wait for rollback completion
    echo "⏳ Waiting for rollback to complete..."
    kubectl rollout status deployment/${APP_NAME} -n "${NAMESPACE}" --timeout=300s

    # Verify system stability after rollback
    if ! verify_deployment "${environment}"; then
        echo -e "${RED}❌ System unstable after rollback${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Rollback completed successfully${NC}"
    return 0
}

# Main deployment function
main() {
    local environment=$1
    local version=$2
    
    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        echo -e "${RED}❌ Invalid environment: ${environment}. Must be one of: ${ENVIRONMENTS[*]}${NC}"
        exit 1
    }

    # Execute deployment steps
    if ! check_prerequisites; then
        echo -e "${RED}❌ Prerequisites check failed${NC}"
        exit 1
    fi

    if ! build_image "${environment}" "${version}"; then
        echo -e "${RED}❌ Image build failed${NC}"
        exit 1
    fi

    local image_uri=$(push_image "${APP_NAME}:${version}-${environment}")
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Image push failed${NC}"
        exit 1
    fi

    if ! deploy_kubernetes "${environment}" "${image_uri}"; then
        echo -e "${RED}❌ Kubernetes deployment failed${NC}"
        local previous_version=$(kubectl get deployment/${APP_NAME} -n "${NAMESPACE}" -o jsonpath='{.metadata.annotations.kubernetes\.io/change-cause}' | grep -oP 'version: \K[^}]+')
        rollback "${environment}" "${previous_version}"
        exit 1
    fi

    if ! verify_deployment "${environment}"; then
        echo -e "${RED}❌ Deployment verification failed${NC}"
        local previous_version=$(kubectl get deployment/${APP_NAME} -n "${NAMESPACE}" -o jsonpath='{.metadata.annotations.kubernetes\.io/change-cause}' | grep -oP 'version: \K[^}]+')
        rollback "${environment}" "${previous_version}"
        exit 1
    fi

    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Script entry point
if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <environment> <version>"
    echo "Environments: ${ENVIRONMENTS[*]}"
    exit 1
fi

main "$1" "$2"