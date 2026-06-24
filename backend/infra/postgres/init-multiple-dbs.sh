#!/bin/bash
# Tạo nhiều database từ biến POSTGRES_MULTIPLE_DATABASES (phân tách bằng dấu phẩy).
# Chạy tự động bởi postgres image qua /docker-entrypoint-initdb.d.
set -euo pipefail

create_db() {
  local db="$1"
  echo "  -> creating database '$db'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE "$db"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
  IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"
  for db in "${DBS[@]}"; do
    create_db "$(echo "$db" | xargs)"   # xargs trims whitespace
  done
  echo "Multiple databases created."
fi
