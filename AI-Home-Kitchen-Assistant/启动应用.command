#!/bin/zsh
set -e
cd "${0:A:h}"

python3 server.py &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://localhost:8765/"
wait "$server_pid"
