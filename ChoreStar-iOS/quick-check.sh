#!/bin/bash

# ChoreStar iOS - Quick Swift Syntax Checker
# Usage: ./quick-check.sh [optional: specific file path]

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ ChoreStar Quick Check${NC}"
echo "=========================="
echo ""

# Determine what to check
if [ -n "$1" ]; then
    TARGET="$1"
    echo "📁 Checking: $TARGET"
else
    TARGET="ChoreStar"
    echo "📁 Checking: All Swift files in $TARGET/"
fi

echo ""

# Find all Swift files
if [ -f "$TARGET" ]; then
    SWIFT_FILES="$TARGET"
elif [ -d "$TARGET" ]; then
    SWIFT_FILES=$(find "$TARGET" -name "*.swift" 2>/dev/null)
else
    SWIFT_FILES=$(find . -name "*.swift" 2>/dev/null)
fi

if [ -z "$SWIFT_FILES" ]; then
    echo -e "${RED}❌ No Swift files found${NC}"
    exit 1
fi

FILE_COUNT=$(echo "$SWIFT_FILES" | wc -l | tr -d ' ')
echo "📝 Found ${FILE_COUNT} Swift file(s)"
echo ""

# Check each file
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
PROBLEM_FILES=()

echo -e "${BLUE}🔍 Analyzing files...${NC}"
echo ""

while IFS= read -r file; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Use swiftc to check syntax
    OUTPUT=$(swiftc -typecheck "$file" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
        ERRORS=$(echo "$OUTPUT" | grep -c "error:" || true)
        WARNINGS=$(echo "$OUTPUT" | grep -c "warning:" || true)
        
        if [ "$ERRORS" -gt 0 ] || [ "$WARNINGS" -gt 0 ]; then
            PROBLEM_FILES+=("$file")
            TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
            TOTAL_WARNINGS=$((TOTAL_WARNINGS + WARNINGS))
            
            echo -e "${YELLOW}📄 ${file}${NC}"
            
            if [ "$ERRORS" -gt 0 ]; then
                echo -e "   ${RED}✗ ${ERRORS} error(s)${NC}"
                echo "$OUTPUT" | grep "error:" | sed 's/^/   /'
            fi
            
            if [ "$WARNINGS" -gt 0 ]; then
                echo -e "   ${YELLOW}⚠ ${WARNINGS} warning(s)${NC}"
                echo "$OUTPUT" | grep "warning:" | sed 's/^/   /'
            fi
            
            echo ""
        fi
    fi
done <<< "$SWIFT_FILES"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Quick Check Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Files checked: ${FILE_COUNT}"
echo "Files with issues: ${#PROBLEM_FILES[@]}"
echo ""
echo -e "Total Errors:   ${RED}${TOTAL_ERRORS}${NC}"
echo -e "Total Warnings: ${YELLOW}${TOTAL_WARNINGS}${NC}"
echo ""

if [ "$TOTAL_ERRORS" -eq 0 ] && [ "$TOTAL_WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✨ All files look good!${NC}"
    exit 0
elif [ "$TOTAL_ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No errors, but ${TOTAL_WARNINGS} warning(s) found${NC}"
    exit 0
else
    echo -e "${RED}❌ Found ${TOTAL_ERRORS} error(s) and ${TOTAL_WARNINGS} warning(s)${NC}"
    exit 1
fi

