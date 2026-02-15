#!/bin/bash
# write-blog-article.sh
# Generates the next unwritten blog article from blog-topics.json
# Usage: ./scripts/write-blog-article.sh [day_number]
# If no day_number is provided, writes the next unwritten article.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOPICS_FILE="$PROJECT_DIR/blog-topics.json"
BLOG_DIR="$PROJECT_DIR/src/content/blog"

# Determine which article to write
if [ -n "$1" ]; then
  DAY=$1
else
  # Find the next unwritten article
  for i in $(seq 1 30); do
    SLUG=$(python3 -c "
import json
with open('$TOPICS_FILE') as f:
    topics = json.load(f)['topics']
for t in topics:
    if t['day'] == $i:
        print(t['slug'])
        break
")
    if [ ! -f "$BLOG_DIR/${SLUG}.md" ]; then
      DAY=$i
      break
    fi
  done

  if [ -z "$DAY" ]; then
    echo "All 30 articles have been written!"
    exit 0
  fi
fi

# Extract topic details
TOPIC_JSON=$(python3 -c "
import json
with open('$TOPICS_FILE') as f:
    topics = json.load(f)['topics']
for t in topics:
    if t['day'] == $DAY:
        print(json.dumps(t))
        break
")

SLUG=$(echo "$TOPIC_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['slug'])")
TITLE=$(echo "$TOPIC_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")

echo "=== Writing article Day $DAY: $TITLE ==="
echo "    Slug: $SLUG"

# Check if already written
if [ -f "$BLOG_DIR/${SLUG}.md" ]; then
  echo "Article already exists at $BLOG_DIR/${SLUG}.md — skipping."
  exit 0
fi

# Calculate publish date (Day 1 = tomorrow from the date the first article was set up)
# Adjust this base date to when you want Day 1 to publish
BASE_DATE="${BLOG_BASE_DATE:-$(date -v+1d +%Y-%m-%d)}"
if [[ "$(uname)" == "Darwin" ]]; then
  PUB_DATE=$(date -j -v+${DAY}d -f "%Y-%m-%d" "$BASE_DATE" +%Y-%m-%d 2>/dev/null || date -v+${DAY}d +%Y-%m-%d)
else
  PUB_DATE=$(date -d "$BASE_DATE + $DAY days" +%Y-%m-%d)
fi

# Invoke Claude Code to write the article
claude --print -p "
You are writing a blog article for ParkPlannerAI (https://parkplannerai.com), a free web app that provides real-time wait times, crowd predictions, and personalized itinerary planning for theme parks.

IMPORTANT: Before writing, read the style guide at $PROJECT_DIR/BLOG_STYLE_GUIDE.md and the reference article at $BLOG_DIR/epic-universe-wait-times-by-world.md. Follow every rule in the style guide exactly. Match the tone, structure, and formatting of the reference article.

TOPIC DETAILS:
$(echo "$TOPIC_JSON")

PUBLISH DATE: $PUB_DATE

Write the article as a markdown file with this exact frontmatter format:
---
title: \"$TITLE\"
description: \"[use the description from the topic]\"
pubDate: $PUB_DATE
parks: [use the parks array from the topic]
category: \"[use the category from the topic]\"
---

Write the complete markdown file to: $BLOG_DIR/${SLUG}.md
" 2>/dev/null

if [ -f "$BLOG_DIR/${SLUG}.md" ]; then
  echo "=== Successfully wrote: $BLOG_DIR/${SLUG}.md ==="
else
  echo "=== Failed to write article ==="
  exit 1
fi
