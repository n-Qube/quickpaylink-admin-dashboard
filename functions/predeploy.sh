#!/bin/bash
# Wrapper script for npm build to avoid stdin issues

cd "$(dirname "$0")"

# Run tsc with explicit stdin/stdout
exec </dev/null
./node_modules/.bin/tsc

exit $?
