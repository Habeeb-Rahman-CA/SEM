#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Sport Event Management (SEM) Application Stack ===${NC}"

# Check for Docker and docker-compose
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
        DOCKER_AVAILABLE=true
    fi
fi

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${GREEN}[Docker] Starting infrastructure services (Postgres, Redis, Elasticsearch)...${NC}"
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
else
    echo -e "${YELLOW}[Warning] Docker or Docker Compose not found. Assuming Postgres, Redis, and Elasticsearch are running locally on default ports.${NC}"
fi

# Function to check port status using bash sockets
check_port() {
    local host=$1
    local port=$2
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" &> /dev/null
}

echo -e "${YELLOW}Checking readiness of core database and cache...${NC}"

# Check Postgres (5432)
RETRIES=0
until check_port localhost 5432 || [ $RETRIES -eq 5 ]; do
    echo -e "${YELLOW}Waiting for Postgres on port 5432...${NC}"
    sleep 2
    RETRIES=$((RETRIES + 1))
done

if check_port localhost 5432; then
    echo -e "${GREEN}✓ Postgres is up!${NC}"
else
    echo -e "${RED}✗ Postgres is not reachable on port 5432.${NC}"
fi

# Check Redis (6379)
RETRIES=0
until check_port localhost 6379 || [ $RETRIES -eq 5 ]; do
    echo -e "${YELLOW}Waiting for Redis on port 6379...${NC}"
    sleep 2
    RETRIES=$((RETRIES + 1))
done

if check_port localhost 6379; then
    echo -e "${GREEN}✓ Redis is up!${NC}"
else
    echo -e "${RED}✗ Redis is not reachable on port 6379.${NC}"
fi

# Check Elasticsearch (9200)
if check_port localhost 9200; then
    echo -e "${GREEN}✓ Elasticsearch is up!${NC}"
else
    echo -e "${YELLOW}! Elasticsearch on port 9200 is not active yet (application will automatically fall back to database search)${NC}"
fi

# Run the backend and frontend dev servers
echo -e "${GREEN}Starting backend and frontend dev servers concurrently...${NC}"
npm start
