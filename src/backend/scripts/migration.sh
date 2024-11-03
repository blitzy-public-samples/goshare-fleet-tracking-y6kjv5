#!/bin/bash

# Human Tasks:
# 1. Ensure database credentials are properly configured in .env file
# 2. Set up migration directories: /migrations/{postgresql,mongodb}/{version}
# 3. Configure backup storage with sufficient space (minimum 2x database size)
# 4. Set up appropriate database user permissions for migrations
# 5. Configure monitoring alerts for migration status
# 6. Review and update retention policies in BACKUP_RETENTION_DAYS if needed

# Requirement: Database Architecture - Manage database schema and data migrations
# Version: pg ^8.11.0, mongoose ^7.4.0, dotenv ^16.3.1

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Global variables from specification
MIGRATION_DIR="/migrations"
BACKUP_DIR="/backups"
LOG_DIR="/logs/migrations"
SUPPORTED_DATABASES=("postgresql" "mongodb")
MIGRATION_TABLE="schema_migrations"
BACKUP_RETENTION_DAYS=30
LOCK_TIMEOUT=300000

# Requirement: Data Consistency - Ensure data integrity through validation
check_environment() {
    local required_vars=(
        "DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD"
        "MONGODB_URI" "NODE_ENV"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Error: Required environment variable $var is not set"
            return 1
        fi
    done

    # Validate environment type
    if [[ ! "$NODE_ENV" =~ ^(development|staging|production)$ ]]; then
        echo "Error: Invalid NODE_ENV. Must be development, staging, or production"
        return 1
    }

    # Check migration directories
    for db in "${SUPPORTED_DATABASES[@]}"; do
        if [ ! -d "$MIGRATION_DIR/$db" ]; then
            echo "Error: Migration directory $MIGRATION_DIR/$db not found"
            return 1
        fi
    done

    # Verify backup directory exists and has sufficient space
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi

    # Check available disk space (require 2x current DB size)
    local available_space=$(df -P "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=$(($(du -s "$DB_NAME" 2>/dev/null || echo "0") * 2))
    if [ "$available_space" -lt "$required_space" ]; then
        echo "Error: Insufficient disk space for backups"
        return 1
    fi

    return 0
}

# Requirement: High Availability - Execute migrations with minimal downtime
run_postgres_migrations() {
    local direction=$1
    local version=$2
    local migration_path="$MIGRATION_DIR/postgresql/$version"
    local log_file="$LOG_DIR/postgresql/$(date +%Y%m%d_%H%M%S).log"

    mkdir -p "$(dirname "$log_file")"

    echo "Starting PostgreSQL migration: $direction to version $version"

    # Create migrations table if not exists
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
        CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT
        );
EOSQL

    # Start transaction
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
        BEGIN;
        SET lock_timeout = $LOCK_TIMEOUT;
EOSQL

    # Execute migration files in order
    for sql_file in $(ls -v "$migration_path"/*.sql 2>/dev/null); do
        echo "Executing $sql_file..."
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file" >> "$log_file" 2>&1; then
            echo "Error: Migration failed, rolling back"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ROLLBACK;"
            return 1
        fi
    done

    # Update migration version
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
        INSERT INTO $MIGRATION_TABLE (version) VALUES ('$version')
        ON CONFLICT (version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;
        COMMIT;
EOSQL

    echo "PostgreSQL migration completed successfully"
    return 0
}

# Requirement: Database Architecture - Support for MongoDB migrations
run_mongo_migrations() {
    local direction=$1
    local version=$2
    local migration_path="$MIGRATION_DIR/mongodb/$version"
    local log_file="$LOG_DIR/mongodb/$(date +%Y%m%d_%H%M%S).log"

    mkdir -p "$(dirname "$log_file")"

    echo "Starting MongoDB migration: $direction to version $version"

    # Create migrations collection if not exists
    mongosh "$MONGODB_URI" --eval "
        if (!db.getCollectionNames().includes('$MIGRATION_TABLE')) {
            db.createCollection('$MIGRATION_TABLE');
            db.$MIGRATION_TABLE.createIndex({ version: 1 }, { unique: true });
        }
    "

    # Start session for transaction support
    mongosh "$MONGODB_URI" --eval "
        const session = db.getMongo().startSession();
        session.startTransaction();
        
        try {
            // Execute migration files
            $(for js_file in $(ls -v "$migration_path"/*.js 2>/dev/null); do
                echo "load('$js_file');"
            done)

            // Update migration version
            db.$MIGRATION_TABLE.updateOne(
                { version: '$version' },
                { \$set: { version: '$version', applied_at: new Date() } },
                { upsert: true }
            );

            session.commitTransaction();
        } catch (error) {
            session.abortTransaction();
            print('Error during migration: ' + error);
            quit(1);
        } finally {
            session.endSession();
        }
    " >> "$log_file" 2>&1

    if [ $? -ne 0 ]; then
        echo "Error: MongoDB migration failed"
        return 1
    fi

    echo "MongoDB migration completed successfully"
    return 0
}

# Requirement: Data Consistency - Automated backups before migrations
backup_database() {
    local database_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$database_type/$timestamp"
    
    mkdir -p "$backup_path"

    case "$database_type" in
        "postgresql")
            echo "Creating PostgreSQL backup..."
            if ! pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc -f "$backup_path/backup.dump"; then
                echo "Error: PostgreSQL backup failed"
                return 1
            fi
            ;;
        "mongodb")
            echo "Creating MongoDB backup..."
            if ! mongodump --uri="$MONGODB_URI" --archive="$backup_path/backup.archive" --gzip; then
                echo "Error: MongoDB backup failed"
                return 1
            fi
            ;;
        *)
            echo "Error: Unsupported database type: $database_type"
            return 1
            ;;
    esac

    # Compress backup
    tar -czf "$backup_path.tar.gz" -C "$backup_path" .
    rm -rf "$backup_path"

    # Generate checksum
    sha256sum "$backup_path.tar.gz" > "$backup_path.tar.gz.sha256"

    # Cleanup old backups
    find "$BACKUP_DIR/$database_type" -type f -name "*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
    find "$BACKUP_DIR/$database_type" -type f -name "*.sha256" -mtime +$BACKUP_RETENTION_DAYS -delete

    echo "Backup created successfully at $backup_path.tar.gz"
    echo "$backup_path.tar.gz"
}

# Requirement: High Availability - Automatic rollback capabilities
restore_database() {
    local database_type=$1
    local backup_path=$2

    # Verify backup integrity
    if ! sha256sum -c "$backup_path.sha256"; then
        echo "Error: Backup checksum verification failed"
        return 1
    fi

    # Extract backup
    local temp_dir="/tmp/restore_$(date +%s)"
    mkdir -p "$temp_dir"
    tar -xzf "$backup_path" -C "$temp_dir"

    case "$database_type" in
        "postgresql")
            echo "Restoring PostgreSQL backup..."
            # Terminate existing connections
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
EOSQL
            # Restore database
            if ! pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$temp_dir/backup.dump"; then
                echo "Error: PostgreSQL restore failed"
                rm -rf "$temp_dir"
                return 1
            fi
            ;;
        "mongodb")
            echo "Restoring MongoDB backup..."
            if ! mongorestore --uri="$MONGODB_URI" --archive="$temp_dir/backup.archive" --gzip --drop; then
                echo "Error: MongoDB restore failed"
                rm -rf "$temp_dir"
                return 1
            fi
            ;;
        *)
            echo "Error: Unsupported database type: $database_type"
            rm -rf "$temp_dir"
            return 1
            ;;
    esac

    rm -rf "$temp_dir"
    echo "Database restored successfully from $backup_path"
    return 0
}

# Main execution
main() {
    local command=$1
    local database_type=$2
    local version=$3
    local direction=${4:-"up"}

    # Validate inputs
    if [[ ! " ${SUPPORTED_DATABASES[@]} " =~ " ${database_type} " ]]; then
        echo "Error: Unsupported database type. Must be one of: ${SUPPORTED_DATABASES[*]}"
        exit 1
    fi

    # Check environment
    if ! check_environment; then
        echo "Error: Environment check failed"
        exit 1
    fi

    case "$command" in
        "migrate")
            # Create backup before migration
            local backup_file=$(backup_database "$database_type")
            if [ $? -ne 0 ]; then
                echo "Error: Backup failed, aborting migration"
                exit 1
            fi

            # Run migration
            case "$database_type" in
                "postgresql")
                    if ! run_postgres_migrations "$direction" "$version"; then
                        echo "Error: PostgreSQL migration failed, attempting rollback..."
                        restore_database "postgresql" "$backup_file"
                        exit 1
                    fi
                    ;;
                "mongodb")
                    if ! run_mongo_migrations "$direction" "$version"; then
                        echo "Error: MongoDB migration failed, attempting rollback..."
                        restore_database "mongodb" "$backup_file"
                        exit 1
                    fi
                    ;;
            esac
            ;;
        "backup")
            backup_database "$database_type"
            ;;
        "restore")
            restore_database "$database_type" "$version"  # version parameter is used as backup path
            ;;
        *)
            echo "Usage: $0 {migrate|backup|restore} {postgresql|mongodb} {version} [direction]"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"