#!/bin/bash

# Human Tasks:
# 1. Configure AWS CLI with appropriate credentials and permissions
# 2. Set up encryption keys in AWS KMS for backup encryption
# 3. Configure S3 bucket lifecycle policies for backup retention
# 4. Set up cross-region replication for S3 buckets
# 5. Configure monitoring alerts for backup job failures
# 6. Verify backup restore procedures in DR scenarios
# 7. Set up proper IAM roles and policies for backup operations

# Requirement: Data Backup Strategy - Implementation of backup frequencies and retention periods
# shellcheck disable=SC2034
BACKUP_ROOT="/var/backups/fleet-tracker"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_LOG="/var/log/fleet-tracker/backup.log"

# Requirement: Data Security - Encryption configuration
ENCRYPTION_KEY_ID="alias/fleet-tracker-backup"
ENCRYPTION_ALGORITHM="AES-256"

# Requirement: High Availability - Multi-region configuration
PRIMARY_REGION="us-east-1"
DR_REGIONS=("us-west-2" "eu-west-1")

# Requirement: Data Backup Strategy - Retention periods for different data types
declare -A RETENTION_DAYS=(
    ["config"]=30
    ["transaction"]=2555  # 7 years
    ["location"]=365      # 1 year
    ["logs"]=90          # 90 days
    ["analytics"]=1825    # 5 years
)

# Load environment variables
# shellcheck disable=SC1090
source "$(dirname "$0")/../.env"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_LOG"
}

# Error handling function
handle_error() {
    local exit_code=$?
    log "ERROR: $1 (Exit Code: $exit_code)"
    # Send alert notification
    aws sns publish \
        --topic-arn "$SNS_ALERT_TOPIC" \
        --message "Backup failure: $1" \
        --region "$PRIMARY_REGION"
    exit "$exit_code"
}

# Requirement: Data Security - Backup encryption with AES-256
encrypt_backup() {
    local input_file=$1
    local output_file="$input_file.enc"
    
    aws kms encrypt \
        --key-id "$ENCRYPTION_KEY_ID" \
        --plaintext "fileb://$input_file" \
        --output text \
        --query CiphertextBlob \
        --region "$PRIMARY_REGION" > "$output_file" || handle_error "Encryption failed for $input_file"
    
    rm "$input_file"
    echo "$output_file"
}

# Requirement: High Availability - Multi-region backup replication
replicate_to_regions() {
    local source_file=$1
    local s3_path=$2
    
    for region in "${DR_REGIONS[@]}"; do
        log "Replicating backup to region: $region"
        aws s3 cp \
            "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/${s3_path}" \
            "s3://${AWS_S3_BUCKET}-${region}/${s3_path}" \
            --region "$region" || handle_error "Replication failed to region $region"
    done
}

# Requirement: Data Backup Strategy - PostgreSQL backup with encryption
backup_postgres() {
    local backup_type=$1
    local destination_path=$2
    local db_host
    
    db_host=$(getReadReplica "$PRIMARY_REGION")
    log "Starting PostgreSQL backup (type: $backup_type) from host: $db_host"
    
    mkdir -p "$destination_path"
    
    # Use pg_dump for backup with compression
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$db_host" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -F c \
        -Z 9 \
        -f "${destination_path}/postgres_${TIMESTAMP}.dump" || handle_error "PostgreSQL backup failed"
    
    # Encrypt the backup
    local encrypted_file
    encrypted_file=$(encrypt_backup "${destination_path}/postgres_${TIMESTAMP}.dump")
    
    # Upload to S3 with server-side encryption
    aws s3 cp \
        "$encrypted_file" \
        "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/postgres/${backup_type}/" \
        --sse aws:kms \
        --sse-kms-key-id "$ENCRYPTION_KEY_ID" \
        --region "$PRIMARY_REGION" || handle_error "S3 upload failed for PostgreSQL backup"
    
    # Replicate to DR regions
    replicate_to_regions "$encrypted_file" "postgres/${backup_type}/$(basename "$encrypted_file")"
    
    rm "$encrypted_file"
    return 0
}

# Requirement: Data Backup Strategy - MongoDB backup with point-in-time recovery
backup_mongodb() {
    local backup_type=$1
    local destination_path=$2
    
    log "Starting MongoDB backup (type: $backup_type)"
    
    mkdir -p "$destination_path"
    
    # Use mongodump for backup
    mongodump \
        --uri "$MONGODB_URI" \
        --out "${destination_path}/mongodb_${TIMESTAMP}" \
        --gzip || handle_error "MongoDB backup failed"
    
    # Create tar archive of the backup
    tar -czf "${destination_path}/mongodb_${TIMESTAMP}.tar.gz" \
        -C "$destination_path" "mongodb_${TIMESTAMP}" || handle_error "MongoDB backup compression failed"
    
    # Encrypt the backup
    local encrypted_file
    encrypted_file=$(encrypt_backup "${destination_path}/mongodb_${TIMESTAMP}.tar.gz")
    
    # Upload to S3 with server-side encryption
    aws s3 cp \
        "$encrypted_file" \
        "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/mongodb/${backup_type}/" \
        --sse aws:kms \
        --sse-kms-key-id "$ENCRYPTION_KEY_ID" \
        --region "$PRIMARY_REGION" || handle_error "S3 upload failed for MongoDB backup"
    
    # Replicate to DR regions
    replicate_to_regions "$encrypted_file" "mongodb/${backup_type}/$(basename "$encrypted_file")"
    
    rm -rf "${destination_path}/mongodb_${TIMESTAMP}"
    rm "$encrypted_file"
    return 0
}

# Requirement: Data Backup Strategy - Redis backup with RDB snapshot
backup_redis() {
    local destination_path=$1
    
    log "Starting Redis backup"
    
    mkdir -p "$destination_path"
    
    # Trigger Redis SAVE command
    redis-cli \
        -h "$REDIS_HOST" \
        -p "$REDIS_PORT" \
        -a "$REDIS_PASSWORD" \
        SAVE || handle_error "Redis SAVE command failed"
    
    # Copy and compress Redis dump.rdb
    cp /var/lib/redis/dump.rdb "${destination_path}/redis_${TIMESTAMP}.rdb"
    gzip "${destination_path}/redis_${TIMESTAMP}.rdb" || handle_error "Redis backup compression failed"
    
    # Encrypt the backup
    local encrypted_file
    encrypted_file=$(encrypt_backup "${destination_path}/redis_${TIMESTAMP}.rdb.gz")
    
    # Upload to S3 with server-side encryption
    aws s3 cp \
        "$encrypted_file" \
        "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/redis/" \
        --sse aws:kms \
        --sse-kms-key-id "$ENCRYPTION_KEY_ID" \
        --region "$PRIMARY_REGION" || handle_error "S3 upload failed for Redis backup"
    
    # Replicate to DR regions
    replicate_to_regions "$encrypted_file" "redis/$(basename "$encrypted_file")"
    
    rm "$encrypted_file"
    return 0
}

# Requirement: Data Backup Strategy - Configuration backup
backup_config() {
    local destination_path=$1
    
    log "Starting configuration backup"
    
    mkdir -p "$destination_path"
    
    # Create tar archive of configuration files
    tar -czf "${destination_path}/config_${TIMESTAMP}.tar.gz" \
        -C "$(dirname "$0")/.." \
        .env \
        config/ \
        || handle_error "Configuration backup failed"
    
    # Encrypt the backup
    local encrypted_file
    encrypted_file=$(encrypt_backup "${destination_path}/config_${TIMESTAMP}.tar.gz")
    
    # Upload to S3 with server-side encryption
    aws s3 cp \
        "$encrypted_file" \
        "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/config/" \
        --sse aws:kms \
        --sse-kms-key-id "$ENCRYPTION_KEY_ID" \
        --region "$PRIMARY_REGION" || handle_error "S3 upload failed for configuration backup"
    
    # Replicate to DR regions
    replicate_to_regions "$encrypted_file" "config/$(basename "$encrypted_file")"
    
    rm "$encrypted_file"
    return 0
}

# Requirement: Data Backup Strategy - Retention policy enforcement
enforce_retention() {
    local backup_type=$1
    local retention_days=${RETENTION_DAYS[$backup_type]}
    
    log "Enforcing retention policy for $backup_type backups ($retention_days days)"
    
    # Delete old backups from primary region
    aws s3 rm \
        "s3://${AWS_S3_BUCKET}-${PRIMARY_REGION}/${backup_type}/" \
        --recursive \
        --region "$PRIMARY_REGION" \
        --exclude "*" \
        --include "*.enc" \
        --older-than "${retention_days}d" || handle_error "Retention policy enforcement failed for $backup_type"
    
    # Delete old backups from DR regions
    for region in "${DR_REGIONS[@]}"; do
        aws s3 rm \
            "s3://${AWS_S3_BUCKET}-${region}/${backup_type}/" \
            --recursive \
            --region "$region" \
            --exclude "*" \
            --include "*.enc" \
            --older-than "${retention_days}d" || log "Warning: Retention policy enforcement failed for $backup_type in region $region"
    done
}

# Main backup execution
main() {
    log "Starting backup process"
    
    # Create backup directories
    mkdir -p "$BACKUP_ROOT"/{postgres,mongodb,redis,config}
    
    # Perform backups
    backup_postgres "full" "$BACKUP_ROOT/postgres"
    backup_mongodb "full" "$BACKUP_ROOT/mongodb"
    backup_redis "$BACKUP_ROOT/redis"
    backup_config "$BACKUP_ROOT/config"
    
    # Enforce retention policies
    for backup_type in "${!RETENTION_DAYS[@]}"; do
        enforce_retention "$backup_type"
    done
    
    # Cleanup temporary files
    rm -rf "$BACKUP_ROOT"/*
    
    log "Backup process completed successfully"
}

# Trap errors
trap 'handle_error "Script interrupted"' INT TERM

# Execute main function
main