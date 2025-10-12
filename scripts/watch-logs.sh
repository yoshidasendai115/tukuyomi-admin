#!/bin/bash

# Vercel Production Logs Monitor
# Usage: ./scripts/watch-logs.sh

PRODUCTION_URL="https://admin.garunavi.jp"
REFRESH_INTERVAL=30

echo "=========================================="
echo "  Vercel Production Logs Monitor"
echo "  URL: $PRODUCTION_URL"
echo "  Refresh: ${REFRESH_INTERVAL}s"
echo "  Press Ctrl+C to exit"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Trap Ctrl+C
trap 'echo -e "\n${GREEN}Log monitoring stopped.${NC}"; exit 0' INT

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    echo -e "${BLUE}=== Logs at $TIMESTAMP ===${NC}"

    # Fetch logs from Vercel
    LOGS=$(vercel logs "$PRODUCTION_URL" 2>&1)

    if [ $? -eq 0 ]; then
        # Highlight errors and warnings
        echo "$LOGS" | while IFS= read -r line; do
            if [[ $line == *"ERROR"* ]] || [[ $line == *"error"* ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ $line == *"WARN"* ]] || [[ $line == *"warning"* ]]; then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        echo -e "${RED}Failed to fetch logs${NC}"
        echo "$LOGS"
    fi

    echo ""
    echo -e "${GREEN}Waiting ${REFRESH_INTERVAL}s for next refresh...${NC}"
    echo ""

    sleep $REFRESH_INTERVAL
done
