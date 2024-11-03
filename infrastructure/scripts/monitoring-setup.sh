#!/bin/bash

# Human Tasks:
# 1. Ensure kubectl and helm are installed with correct versions
# 2. Verify cluster admin access is available
# 3. Configure external DNS if using custom domains
# 4. Set up SSL certificates if required
# 5. Review and adjust resource quotas based on cluster capacity

# Script version and required tool versions
# kubectl v1.25+
# helm v3.0+

set -euo pipefail

# Global variables from specification
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="9.5.0"
PROMETHEUS_VALUES_FILE="../kubernetes/monitoring/prometheus/values.yaml"
GRAFANA_VALUES_FILE="../kubernetes/monitoring/grafana/values.yaml"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to check required tools
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl v1.25 or later."
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        error "helm is not installed. Please install helm v3.0 or later."
        exit 1
    }
    
    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        error "Unable to access Kubernetes cluster. Please check your kubeconfig."
        exit 1
    }
    
    log "Prerequisites check completed successfully."
}

# Requirement: Infrastructure Monitoring (4.4.4 Infrastructure/Technology Stack)
# Function to create and configure monitoring namespace
create_monitoring_namespace() {
    log "Creating monitoring namespace..."
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        kubectl create namespace "$MONITORING_NAMESPACE"
    fi
    
    # Label namespace for monitoring
    kubectl label namespace "$MONITORING_NAMESPACE" \
        monitoring=enabled \
        app.kubernetes.io/part-of=fleet-tracking-system \
        --overwrite
    
    # Apply resource quotas
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: monitoring-quota
  namespace: $MONITORING_NAMESPACE
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
EOF
    
    log "Monitoring namespace configured successfully."
}

# Requirement: System Health Monitoring (A.1.1 System Health Monitoring Thresholds)
# Function to install and configure Prometheus
install_prometheus() {
    log "Installing Prometheus..."
    
    # Add Prometheus helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install Prometheus with custom values
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace "$MONITORING_NAMESPACE" \
        --version "${PROMETHEUS_VERSION#v}" \
        --values "$PROMETHEUS_VALUES_FILE" \
        --set server.persistentVolume.size=50Gi \
        --set alertmanager.persistentVolume.size=10Gi \
        --wait
    
    # Apply Prometheus ConfigMap with monitoring rules
    kubectl apply -f ../kubernetes/monitoring/prometheus/configmap.yaml
    
    # Wait for Prometheus pods to be ready
    kubectl wait --for=condition=ready pod \
        -l app=prometheus,component=server \
        -n "$MONITORING_NAMESPACE" \
        --timeout=300s
    
    # Verify Prometheus endpoint accessibility
    local prometheus_pod=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l app=prometheus,component=server -o jsonpath="{.items[0].metadata.name}")
    kubectl port-forward -n "$MONITORING_NAMESPACE" "$prometheus_pod" 9090:9090 &
    local port_forward_pid=$!
    sleep 5
    
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        log "Prometheus installation verified successfully."
    else
        error "Prometheus health check failed."
        kill $port_forward_pid
        exit 1
    fi
    kill $port_forward_pid
}

# Requirement: Performance Monitoring (1.2 Scope/Performance Requirements)
# Function to install and configure Grafana
install_grafana() {
    log "Installing Grafana..."
    
    # Add Grafana helm repository
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install Grafana with custom values
    helm upgrade --install grafana grafana/grafana \
        --namespace "$MONITORING_NAMESPACE" \
        --version "${GRAFANA_VERSION}" \
        --values "$GRAFANA_VALUES_FILE" \
        --set persistence.enabled=true \
        --set persistence.size=10Gi \
        --wait
    
    # Apply Grafana ConfigMap with dashboards and datasources
    kubectl apply -f ../kubernetes/monitoring/grafana/configmap.yaml
    
    # Wait for Grafana pod to be ready
    kubectl wait --for=condition=ready pod \
        -l app.kubernetes.io/name=grafana \
        -n "$MONITORING_NAMESPACE" \
        --timeout=300s
    
    # Import default dashboards
    local grafana_pod=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l app.kubernetes.io/name=grafana -o jsonpath="{.items[0].metadata.name}")
    
    # Get Grafana admin password
    local grafana_password=$(kubectl get secret --namespace "$MONITORING_NAMESPACE" grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    
    # Configure Prometheus data source
    kubectl exec -n "$MONITORING_NAMESPACE" "$grafana_pod" -- \
        curl -X POST -H "Content-Type: application/json" \
        -d '{"name":"Prometheus","type":"prometheus","url":"http://prometheus-server:9090","access":"proxy","isDefault":true}' \
        "http://admin:${grafana_password}@localhost:3000/api/datasources"
    
    log "Grafana installation completed successfully."
    log "Grafana admin password: $grafana_password"
}

# Requirement: System Health Monitoring (A.1.1 System Health Monitoring Thresholds)
# Function to configure alerting rules and notification channels
configure_alerting() {
    log "Configuring alerting rules..."
    
    # Apply Prometheus alerting rules
    kubectl apply -f ../kubernetes/monitoring/prometheus/rules/
    
    # Configure Grafana alert notification channels
    local grafana_pod=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l app.kubernetes.io/name=grafana -o jsonpath="{.items[0].metadata.name}")
    local grafana_password=$(kubectl get secret --namespace "$MONITORING_NAMESPACE" grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    
    # Configure email alerts
    kubectl exec -n "$MONITORING_NAMESPACE" "$grafana_pod" -- \
        curl -X POST -H "Content-Type: application/json" \
        -d '{"name":"email","type":"email","settings":{"addresses":"alerts@fleettracker.local"}}' \
        "http://admin:${grafana_password}@localhost:3000/api/alert-notifications"
    
    # Configure Slack alerts
    kubectl exec -n "$MONITORING_NAMESPACE" "$grafana_pod" -- \
        curl -X POST -H "Content-Type: application/json" \
        -d '{"name":"slack","type":"slack","settings":{"url":"https://hooks.slack.com/services/your-webhook-url"}}' \
        "http://admin:${grafana_password}@localhost:3000/api/alert-notifications"
    
    log "Alerting configuration completed successfully."
}

# Main setup function
setup_monitoring() {
    log "Starting monitoring stack setup..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create and configure monitoring namespace
    create_monitoring_namespace
    
    # Install and configure Prometheus
    install_prometheus
    
    # Install and configure Grafana
    install_grafana
    
    # Configure alerting
    configure_alerting
    
    log "Monitoring stack setup completed successfully."
    
    # Display access information
    local grafana_url=$(kubectl get ingress -n "$MONITORING_NAMESPACE" grafana -o jsonpath="{.spec.rules[0].host}" 2>/dev/null || echo "not configured")
    local prometheus_url=$(kubectl get ingress -n "$MONITORING_NAMESPACE" prometheus -o jsonpath="{.spec.rules[0].host}" 2>/dev/null || echo "not configured")
    
    echo -e "\n${GREEN}Monitoring Stack Access Information:${NC}"
    echo -e "Grafana URL: http://$grafana_url"
    echo -e "Prometheus URL: http://$prometheus_url"
    echo -e "Use 'kubectl port-forward' for local access if ingress is not configured."
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_monitoring
fi