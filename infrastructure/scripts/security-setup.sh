#!/bin/bash

# Human Tasks:
# 1. Ensure AWS CLI is configured with proper credentials and EKS cluster access
# 2. Verify all required namespaces exist (fleet-tracking, monitoring)
# 3. Ensure service labels match the actual pod labels in deployments
# 4. Configure audit logging for security monitoring
# 5. Test inter-service communication after applying policies
# 6. Regularly review and update security configurations

# Required versions:
# - kubectl v1.24+
# - aws-cli 2.0+

# Global variables
CLUSTER_NAME="fleet-tracking-cluster"
NAMESPACE="fleet-tracking"
LOG_FILE="/var/log/security-setup.log"

# Requirement: Security Controls (4.6 Security Architecture/Security Layers)
# Function to initialize logging
setup_logging() {
    if [ ! -f "$LOG_FILE" ]; then
        sudo touch "$LOG_FILE"
        sudo chmod 640 "$LOG_FILE"
    fi
    exec 1> >(tee -a "$LOG_FILE")
    exec 2>&1
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting security setup for $CLUSTER_NAME"
}

# Requirement: Authentication and Authorization (8.1 Authentication and Authorization)
# Function to verify cluster connectivity and authentication
verify_cluster_access() {
    echo "Verifying cluster access..."
    if ! aws eks get-token --cluster-name "$CLUSTER_NAME" > /dev/null 2>&1; then
        echo "Error: Unable to authenticate with EKS cluster"
        exit 1
    fi
    
    if ! kubectl cluster-info > /dev/null 2>&1; then
        echo "Error: Unable to connect to Kubernetes cluster"
        exit 1
    fi
    echo "Cluster access verified successfully"
}

# Requirement: Network Security (8.3.1 Network Security)
# Function to set up network policies
setup_network_policies() {
    echo "Setting up network policies..."
    
    # Apply network policies
    if ! kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml; then
        echo "Error: Failed to apply network policies"
        return 1
    fi
    
    # Verify policy application
    local policies=("location-service-policy" "fleet-service-policy" "analytics-service-policy" "monitoring-policy")
    for policy in "${policies[@]}"; do
        if ! kubectl get networkpolicy "$policy" -n "$NAMESPACE" > /dev/null 2>&1; then
            echo "Error: Network policy $policy not found"
            return 1
        fi
    done
    
    echo "Network policies applied successfully"
    return 0
}

# Requirement: Security Controls (4.6 Security Architecture/Security Layers)
# Function to set up pod security policies
setup_pod_security_policies() {
    echo "Setting up pod security policies..."
    
    # Enable PodSecurityPolicy admission controller if not enabled
    if ! kubectl get podsecuritypolicies.policy > /dev/null 2>&1; then
        echo "Error: PodSecurityPolicy admission controller not enabled"
        return 1
    fi
    
    # Apply PSPs
    if ! kubectl apply -f infrastructure/kubernetes/security/pod-security-policies.yaml; then
        echo "Error: Failed to apply pod security policies"
        return 1
    }
    
    # Verify PSP application
    local psps=("restricted-psp" "privileged-psp")
    for psp in "${psps[@]}"; do
        if ! kubectl get psp "$psp" > /dev/null 2>&1; then
            echo "Error: PSP $psp not found"
            return 1
        fi
    done
    
    echo "Pod security policies applied successfully"
    return 0
}

# Requirement: Authentication and Authorization (8.1 Authentication and Authorization)
# Function to set up RBAC configurations
setup_rbac() {
    echo "Setting up RBAC configurations..."
    
    # Apply service accounts
    if ! kubectl apply -f infrastructure/kubernetes/security/service-accounts.yaml; then
        echo "Error: Failed to apply service accounts"
        return 1
    fi
    
    # Apply RBAC roles and bindings
    if ! kubectl apply -f infrastructure/kubernetes/security/rbac.yaml; then
        echo "Error: Failed to apply RBAC configurations"
        return 1
    }
    
    # Verify service accounts
    local accounts=("location-service-account" "fleet-service-account" "analytics-service-account" "monitoring-service-account")
    for account in "${accounts[@]}"; do
        if ! kubectl get serviceaccount "$account" -n "$NAMESPACE" > /dev/null 2>&1; then
            echo "Error: Service account $account not found"
            return 1
        fi
    done
    
    echo "RBAC configurations applied successfully"
    return 0
}

# Requirement: Compliance Requirements (8.3.3 Security Compliance Controls)
# Function to verify security setup
verify_security_setup() {
    echo "Verifying security setup..."
    local status=0
    
    # Verify network policies
    echo "Checking network policies..."
    if ! kubectl get networkpolicies -n "$NAMESPACE" > /dev/null 2>&1; then
        echo "Error: Network policies verification failed"
        status=1
    fi
    
    # Verify PSP enforcement
    echo "Checking PSP enforcement..."
    if ! kubectl auth can-i use podsecuritypolicy/restricted-psp > /dev/null 2>&1; then
        echo "Error: PSP verification failed"
        status=1
    fi
    
    # Verify RBAC permissions
    echo "Checking RBAC permissions..."
    local roles=("location-service-role" "fleet-service-role" "analytics-service-role" "monitoring-cluster-role")
    for role in "${roles[@]}"; do
        if ! kubectl get role "$role" -n "$NAMESPACE" > /dev/null 2>&1; then
            echo "Error: Role $role verification failed"
            status=1
        fi
    done
    
    # Verify service account bindings
    echo "Checking service account bindings..."
    local bindings=("location-service-binding" "fleet-service-binding" "analytics-service-binding")
    for binding in "${bindings[@]}"; do
        if ! kubectl get rolebinding "$binding" -n "$NAMESPACE" > /dev/null 2>&1; then
            echo "Error: Role binding $binding verification failed"
            status=1
        fi
    done
    
    if [ $status -eq 0 ]; then
        echo "Security setup verification completed successfully"
    else
        echo "Security setup verification failed"
    fi
    return $status
}

# Main execution flow
main() {
    setup_logging
    
    # Verify cluster access
    verify_cluster_access || exit 1
    
    # Setup security components
    setup_network_policies || exit 1
    setup_pod_security_policies || exit 1
    setup_rbac || exit 1
    
    # Verify setup
    verify_security_setup || exit 1
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Security setup completed successfully"
}

# Execute main function
main