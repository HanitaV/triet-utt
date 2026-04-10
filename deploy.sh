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
ROOT_DIR="$(pwd)"
TEMP_WORKTREE="$ROOT_DIR/.deploy-gh-pages"

cleanup() {
    cd "$ROOT_DIR" >/dev/null 2>&1 || true
    if [[ -d "$TEMP_WORKTREE" ]]; then
        git worktree remove "$TEMP_WORKTREE" --force >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

echo -e "${YELLOW}🚀 Starting deployment...${NC}"

# Ensure no unrelated local changes before pulling
if [[ -n $(git status --porcelain | sed '/ version\.json$/d') ]]; then
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

# Push to main first
echo -e "${GREEN}📤 Pushing to main...${NC}"
git push origin main

# Create a temporary worktree for gh-pages so the main tree stays on main
echo -e "${GREEN}🔀 Preparing gh-pages worktree...${NC}"
git worktree prune
rm -rf "$TEMP_WORKTREE"
git worktree add -B gh-pages "$TEMP_WORKTREE" origin/gh-pages

pushd "$TEMP_WORKTREE" >/dev/null

echo -e "${GREEN}🔗 Merging main into gh-pages...${NC}"
if ! git merge main; then
    echo -e "${YELLOW}Merge conflicts detected. Resolving in favor of main...${NC}"
    while IFS= read -r conflicted_file; do
        git checkout --theirs -- "$conflicted_file"
        git add -- "$conflicted_file"
    done < <(git diff --name-only --diff-filter=U)
    git commit --no-edit
fi

echo -e "${GREEN}📤 Pushing to gh-pages...${NC}"
git push origin gh-pages

popd >/dev/null

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}🌐 Site will be live at: https://hanitav.github.io/triet-utt/${NC}"
