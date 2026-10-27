#!/bin/bash
export LD_LIBRARY_PATH="/tmp/mariadb-extract/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
export PATH="/tmp/mariadb-extract/usr/bin:/tmp/mariadb-extract/usr/sbin:$PATH"

pkill -f mariadbd 2>/dev/null
sleep 2

nohup mariadbd \
  --skip-grant-tables \
  --datadir=/tmp/mysql-data \
  --socket=/tmp/mysql-run/mariadb.sock \
  --port=3306 \
  --bind-address=0.0.0.0 \
  --pid-file=/tmp/mysql-run/mariadb.pid \
  --user=z \
  > /tmp/mariadb.log 2>&1 &
disown
sleep 5

# Verify
mariadb -h 127.0.0.1 -P 3306 -u root -e "CREATE DATABASE IF NOT EXISTS surdi; SHOW DATABASES;" 2>&1
echo "MySQL is ready on 127.0.0.1:3306"
