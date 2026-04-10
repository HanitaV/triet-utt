#!/bin/bash

# Deploy script for GitHub Pages
# Usage: ./deploy.sh [commit message]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default commit message
COMMIT_MSG="${1:-"Update site"}"

echo -e "${YELLOW}🚀 Starting deployment...${NC}"

# Ensure working tree is clean before pulling
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Working tree has uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Pull latest changes before version update to avoid merge conflicts
echo -e "${GREEN}📥 Pulling from main...${NC}"
git pull origin main

# Auto-update version info after pull
echo -e "${GREEN}🔢 Updating version info...${NC}"
node update_version.js

# Check if there are changes to commit
if [[ -n $(git status -s) ]]; then
    echo -e "${GREEN}📝 Committing changes...${NC}"
    git add -A
    git commit -m "$COMMIT_MSG"
else
    echo -e "${YELLOW}No changes to commit${NC}"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Push to main first
echo -e "${GREEN}📤 Pushing to main...${NC}"
git push origin main

# Switch to gh-pages and merge
echo -e "${GREEN}🔀 Switching to gh-pages...${NC}"
git checkout gh-pages

echo -e "${GREEN}🔗 Merging main into gh-pages...${NC}"
git merge main

echo -e "${GREEN}📤 Pushing to gh-pages...${NC}"
git push origin gh-pages

# Switch back to original branch
echo -e "${GREEN}↩️ Switching back to $CURRENT_BRANCH...${NC}"
git checkout "$CURRENT_BRANCH"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}🌐 Site will be live at: https://hanitav.github.io/triet-utt/${NC}"
