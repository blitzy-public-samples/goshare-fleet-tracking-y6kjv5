#!/bin/bash

# Human Tasks:
# 1. Ensure AWS CLI v2.x is installed and configured with appropriate credentials
# 2. Install required database clients: postgresql-client-14, mongodb-database-tools, redis-tools
# 3. Configure AWS KMS key for backup encryption and set AWS_KMS_KEY_ID environment variable
# 4. Set up appropriate IAM roles and permissions for S3 access
# 5. Create the backup root directory with appropriate permissions: /var/backups/fleettracker
# 6. Configure database credentials in environment variables or AWS Secrets Manager

# Required environment variables:
# - AWS_KMS_KEY_ID: KMS key ID for backup encryption
# - PGPASSWORD: PostgreSQL password
# - MONGODB_PASSWORD: MongoDB password
# - REDIS_PASSWORD: Redis password
# - AWS_PROFILE: AWS profile to use (optional)

set -euo pipefail

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Global variables from specification
BACKUP_ROOT="/var/backups/fleettracker"
S3_BUCKET="fleettracker-backups"
declare -A RETENTION_PERIODS=(
    ["config"]="30"
    ["transaction"]="2555"
    ["location"]="365"
    ["logs"]="90"
    ["analytics"]="1825"
)

# Requirement: Data Security (8.2.1 Encryption Standards)
# Encryption configuration
ENCRYPTION_KEY="${AWS_KMS_KEY_ID}"

# Logging configuration
LOG_FILE="${BACKUP_ROOT}/backup.log"

# Utility function for logging
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $1" | tee -a "${LOG_FILE}"
}

# Requirement: Data Security (8.2.1 Encryption Standards)
# Function to encrypt backup files using AWS KMS
encrypt_backup() {
    local input_file="$1"
    local output_file="${input_file}.encrypted"
    
    aws kms encrypt \
        --key-id "${ENCRYPTION_KEY}" \
        --plaintext fileb://"${input_file}" \
        --output text \
        --query CiphertextBlob > "${output_file}"
    
    rm "${input_file}"
    echo "${output_file}"
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Function to backup PostgreSQL databases
backup_postgres() {
    local db_host="$1"
    local db_name="$2"
    local backup_path="$3"
    
    log "Starting PostgreSQL backup for ${db_name}"
    
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local backup_file="${backup_path}/postgres_${db_name}_${timestamp}.sql.gz"
    
    # Requirement: High Availability (4.5 Scalability Architecture)
    # Use --no-synchronized-snapshots to minimize impact on system availability
    PGPASSWORD="${PGPASSWORD}" pg_dump \
        -h "${db_host}" \
        -U postgres \
        -d "${db_name}" \
        --no-synchronized-snapshots \
        --clean \
        --compress=9 \
        --format=custom \
        --file="${backup_file}"
    
    # Encrypt and upload to S3
    local encrypted_file=$(encrypt_backup "${backup_file}")
    aws s3 cp "${encrypted_file}" "s3://${S3_BUCKET}/postgres/${db_name}/" \
        --metadata "timestamp=$(date -u +%Y%m%d%H%M%SZ),retention=${RETENTION_PERIODS['transaction']}"
    
    rm "${encrypted_file}"
    log "PostgreSQL backup completed for ${db_name}"
    return 0
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Function to backup MongoDB collections
backup_mongodb() {
    local mongodb_uri="$1"
    local backup_path="$2"
    
    log "Starting MongoDB backup"
    
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local backup_dir="${backup_path}/mongodb_${timestamp}"
    
    # Requirement: High Availability (4.5 Scalability Architecture)
    # Use --oplog for point-in-time snapshot
    mongodump \
        --uri="${mongodb_uri}" \
        --out="${backup_dir}" \
        --oplog \
        --gzip
    
    # Create archive of backup directory
    tar -czf "${backup_dir}.tar.gz" -C "${backup_path}" "mongodb_${timestamp}"
    
    # Encrypt and upload to S3
    local encrypted_file=$(encrypt_backup "${backup_dir}.tar.gz")
    aws s3 cp "${encrypted_file}" "s3://${S3_BUCKET}/mongodb/" \
        --metadata "timestamp=$(date -u +%Y%m%d%H%M%SZ),retention=${RETENTION_PERIODS['location']}"
    
    rm -rf "${backup_dir}" "${backup_dir}.tar.gz" "${encrypted_file}"
    log "MongoDB backup completed"
    return 0
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Function to backup Redis data
backup_redis() {
    local redis_host="$1"
    local backup_path="$2"
    
    log "Starting Redis backup"
    
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local backup_file="${backup_path}/redis_${timestamp}.rdb"
    
    # Requirement: High Availability (4.5 Scalability Architecture)
    # Trigger SAVE command on replica if available
    redis-cli -h "${redis_host}" -a "${REDIS_PASSWORD}" --no-auth-warning SAVE
    redis-cli -h "${redis_host}" -a "${REDIS_PASSWORD}" --no-auth-warning --rdb "${backup_file}"
    
    # Compress backup
    gzip "${backup_file}"
    
    # Encrypt and upload to S3
    local encrypted_file=$(encrypt_backup "${backup_file}.gz")
    aws s3 cp "${encrypted_file}" "s3://${S3_BUCKET}/redis/" \
        --metadata "timestamp=$(date -u +%Y%m%d%H%M%SZ),retention=${RETENTION_PERIODS['config']}"
    
    rm "${backup_file}.gz" "${encrypted_file}"
    log "Redis backup completed"
    return 0
}

# Requirement: Backup Strategy (A.1.3 Backup Strategy Matrix)
# Function to cleanup old backups based on retention policy
cleanup_old_backups() {
    local backup_type="$1"
    local retention_days="$2"
    
    log "Starting cleanup for ${backup_type} backups older than ${retention_days} days"
    
    # Calculate cutoff date
    local cutoff_date=$(date -d "${retention_days} days ago" +%Y%m%d%H%M%SZ)
    
    # List and remove expired backups
    aws s3 ls "s3://${S3_BUCKET}/${backup_type}/" --recursive | while read -r line; do
        local file_date=$(echo "${line}" | awk '{print $1 $2}' | sed 's/[:-]//g')
        if [[ "${file_date}" < "${cutoff_date}" ]]; then
            local file_path=$(echo "${line}" | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/${file_path}"
            log "Removed expired backup: ${file_path}"
        fi
    done
    
    log "Cleanup completed for ${backup_type}"
    return 0
}

# Main backup orchestration function
backup_all() {
    log "Starting backup process"
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_ROOT}"
    
    # Backup PostgreSQL databases
    backup_postgres "${db_instance_endpoint}" "fleettracker" "${BACKUP_ROOT}"
    
    # Backup MongoDB collections
    backup_mongodb "mongodb://${cluster_endpoint}:${cluster_port}" "${BACKUP_ROOT}"
    
    # Backup Redis data
    backup_redis "localhost" "${BACKUP_ROOT}"
    
    # Cleanup old backups
    for type in "${!RETENTION_PERIODS[@]}"; do
        cleanup_old_backups "${type}" "${RETENTION_PERIODS[${type}]}"
    done
    
    log "Backup process completed"
}

# Execute main backup function
backup_all