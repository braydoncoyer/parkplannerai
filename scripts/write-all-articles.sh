#!/bin/bash
# write-all-articles.sh
# Generates all unwritten blog articles sequentially.
# Usage: ./scripts/write-all-articles.sh
# Set BLOG_BASE_DATE to control when Day 1 publishes (default: tomorrow)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$PROJECT_DIR/scripts/write-blog-article.sh"

echo "=== ParkPlannerAI Blog Generator ==="
echo "    Generating all unwritten articles..."
echo ""

for i in $(seq 1 30); do
  bash "$SCRIPT" "$i"
  echo ""
done

echo "=== Done! ==="
