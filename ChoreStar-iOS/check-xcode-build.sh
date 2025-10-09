#!/bin/bash

# ChoreStar iOS - Xcode Build Error/Warning Checker
# Usage: ./check-xcode-build.sh

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ChoreStar"
SCHEME_NAME="ChoreStar"
WORKSPACE_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${WORKSPACE_DIR}/build"
DERIVED_DATA_PATH="${BUILD_DIR}/DerivedData"

echo -e "${BLUE}🔍 ChoreStar iOS Build Checker${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "📁 Project: ${PROJECT_NAME}"
echo "📦 Scheme: ${SCHEME_NAME}"
echo "📂 Workspace: ${WORKSPACE_DIR}"
echo ""

# Clean build directory
echo -e "${BLUE}🧹 Cleaning build directory...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# Run xcodebuild
echo -e "${BLUE}🔨 Building project...${NC}"
echo ""

BUILD_LOG="${BUILD_DIR}/build.log"
ERROR_LOG="${BUILD_DIR}/errors.log"
WARNING_LOG="${BUILD_DIR}/warnings.log"

# Build and capture output
xcodebuild \
    -project "${WORKSPACE_DIR}/${PROJECT_NAME}.xcodeproj" \
    -scheme "${SCHEME_NAME}" \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
    -configuration Debug \
    -derivedDataPath "${DERIVED_DATA_PATH}" \
    clean build \
    2>&1 | tee "${BUILD_LOG}"

BUILD_STATUS=$?

echo ""
echo -e "${BLUE}📊 Analyzing build results...${NC}"
echo ""

# Extract errors
grep -i "error:" "${BUILD_LOG}" > "${ERROR_LOG}" 2>/dev/null || true
ERROR_COUNT=$(wc -l < "${ERROR_LOG}" | tr -d ' ')

# Extract warnings
grep -i "warning:" "${BUILD_LOG}" > "${WARNING_LOG}" 2>/dev/null || true
WARNING_COUNT=$(wc -l < "${WARNING_LOG}" | tr -d ' ')

# Display results
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Build Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "Build Status: ${GREEN}✓ SUCCESS${NC}"
else
    echo -e "Build Status: ${RED}✗ FAILED${NC}"
fi

echo ""
echo -e "Errors:   ${RED}${ERROR_COUNT}${NC}"
echo -e "Warnings: ${YELLOW}${WARNING_COUNT}${NC}"
echo ""

# Show errors if any
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}❌ ERRORS (${ERROR_COUNT})${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    cat "${ERROR_LOG}"
    echo ""
fi

# Show warnings if any
if [ "$WARNING_COUNT" -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}⚠️  WARNINGS (${WARNING_COUNT})${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    cat "${WARNING_LOG}"
    echo ""
fi

# Show file locations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📄 Log Files${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Full build log: ${BUILD_LOG}"
echo "Errors only:    ${ERROR_LOG}"
echo "Warnings only:  ${WARNING_LOG}"
echo ""

# Summary
if [ $BUILD_STATUS -eq 0 ] && [ "$ERROR_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}🎉 Perfect build! No errors or warnings.${NC}"
    exit 0
elif [ $BUILD_STATUS -eq 0 ] && [ "$WARNING_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Build succeeded but has ${WARNING_COUNT} warning(s). Consider fixing them.${NC}"
    exit 0
else
    echo -e "${RED}❌ Build failed with ${ERROR_COUNT} error(s).${NC}"
    exit 1
fi

