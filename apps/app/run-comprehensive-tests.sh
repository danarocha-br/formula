#!/bin/bash

echo "🧪 Running Comprehensive Test Suite for React Query Optimization"
echo "================================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories
declare -a test_categories=(
    "__tests__/cache-utilities/"
    "__tests__/performance/memory-leak-detection.test.ts"
    "__tests__/end-to-end/complete-user-workflows.test.tsx"
)

# Track results
total_tests=0
passed_tests=0
failed_tests=0

echo -e "${YELLOW}Running Cache Utilities Tests...${NC}"
npm run test -- --run __tests__/cache-utilities/ --reporter=verbose
cache_result=$?

echo -e "${YELLOW}Running Performance Tests...${NC}"
npm run test -- --run __tests__/performance/memory-leak-detection.test.ts --reporter=verbose
perf_result=$?

echo -e "${YELLOW}Running End-to-End Tests...${NC}"
npm run test -- --run __tests__/end-to-end/complete-user-workflows.test.tsx --reporter=verbose
e2e_result=$?

# Summary
echo ""
echo "================================================================"
echo "🏁 Test Suite Summary"
echo "================================================================"

if [ $cache_result -eq 0 ]; then
    echo -e "${GREEN}✅ Cache Utilities Tests: PASSED${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ Cache Utilities Tests: FAILED${NC}"
    ((failed_tests++))
fi

if [ $perf_result -eq 0 ]; then
    echo -e "${GREEN}✅ Performance Tests: PASSED${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ Performance Tests: FAILED${NC}"
    ((failed_tests++))
fi

if [ $e2e_result -eq 0 ]; then
    echo -e "${GREEN}✅ End-to-End Tests: PASSED${NC}"
    ((passed_tests++))
else
    echo -e "${RED}❌ End-to-End Tests: FAILED${NC}"
    ((failed_tests++))
fi

total_tests=$((passed_tests + failed_tests))

echo ""
echo "📊 Results: $passed_tests/$total_tests test suites passed"

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 $failed_tests test suite(s) failed${NC}"
    exit 1
fi