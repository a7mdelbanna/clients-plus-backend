#!/bin/bash

# Master Test Runner - Comprehensive API Test Suite
# Executes all test suites and generates consolidated report

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="comprehensive-test-results-$TEST_TIMESTAMP"
BASE_URL="http://localhost:3000/api/v1"

# Test suite definitions
declare -A TEST_SUITES=(
    ["auth"]="Authentication Flow Tests:auth-comprehensive-test.sh"
    ["company"]="Company/Branch Management Tests:company-branch-comprehensive-test.sh" 
    ["client"]="Client Management Tests:client-comprehensive-test.sh"
    ["appointment"]="Appointment Management Tests:appointment-comprehensive-test.sh"
    ["integration"]="Integration Workflow Tests:integration-test.sh"
    ["performance"]="Performance & Load Tests:performance-test.sh"
)

# Test results tracking
declare -A SUITE_RESULTS
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Main log file
MASTER_LOG="$RESULTS_DIR/master-test-log.txt"

# Initialize results directory
init_results_directory() {
    mkdir -p "$RESULTS_DIR"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Comprehensive API Test Suite" > "$MASTER_LOG"
    echo "Results will be saved to: $RESULTS_DIR"
}

# Print banner
print_banner() {
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                              ║${NC}"
    echo -e "${CYAN}║           🧪 COMPREHENSIVE API TEST SUITE 🧪                ║${NC}"
    echo -e "${CYAN}║                                                              ║${NC}"
    echo -e "${CYAN}║  Testing all API endpoints with integration scenarios       ║${NC}"
    echo -e "${CYAN}║  and performance benchmarks                                  ║${NC}"
    echo -e "${CYAN}║                                                              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${BLUE}Test Suite Configuration:${NC}"
    echo -e "Base URL: $BASE_URL"
    echo -e "Results Directory: $RESULTS_DIR"
    echo -e "Timestamp: $TEST_TIMESTAMP"
    echo -e "Total Test Suites: ${#TEST_SUITES[@]}\n"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"
    
    # Check if server is running
    local health_check=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")
    
    if [ "$health_check" != "200" ]; then
        echo -e "${RED}❌ Server is not responding at $BASE_URL${NC}"
        echo -e "${YELLOW}Please ensure the API server is running before running tests${NC}"
        echo -e "${YELLOW}Try: npm run dev${NC}"
        exit 1
    fi
    
    # Check required tools
    local missing_tools=()
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    command -v jq >/dev/null 2>&1 || echo -e "${YELLOW}⚠️ jq not found - JSON parsing may be limited${NC}"
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}\n"
}

# Run individual test suite
run_test_suite() {
    local suite_key="$1"
    local suite_info="${TEST_SUITES[$suite_key]}"
    local suite_name=$(echo "$suite_info" | cut -d: -f1)
    local script_name=$(echo "$suite_info" | cut -d: -f2)
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}🧪 $suite_name${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    # Check if script exists and is executable
    if [ ! -f "$script_name" ]; then
        echo -e "${RED}❌ Test script not found: $script_name${NC}"
        SUITE_RESULTS[$suite_key]="MISSING"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return 1
    fi
    
    if [ ! -x "$script_name" ]; then
        echo -e "${YELLOW}⚠️ Making script executable: $script_name${NC}"
        chmod +x "$script_name"
    fi
    
    # Run the test suite
    local start_time=$(date +%s)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting $suite_name" >> "$MASTER_LOG"
    
    if ./"$script_name" > "$RESULTS_DIR/${suite_key}-output.log" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}✅ $suite_name PASSED${NC} (${duration}s)"
        SUITE_RESULTS[$suite_key]="PASSED:${duration}s"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $suite_name PASSED (${duration}s)" >> "$MASTER_LOG"
        
        # Copy individual result files to results directory
        for result_file in *-test-results.txt *-test-*.log; do
            if [ -f "$result_file" ]; then
                mv "$result_file" "$RESULTS_DIR/" 2>/dev/null || true
            fi
        done
        
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}❌ $suite_name FAILED${NC} (${duration}s)"
        SUITE_RESULTS[$suite_key]="FAILED:${duration}s"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $suite_name FAILED (${duration}s)" >> "$MASTER_LOG"
        
        # Show last few lines of output for failed tests
        echo -e "${YELLOW}Last 10 lines of output:${NC}"
        tail -n 10 "$RESULTS_DIR/${suite_key}-output.log" | sed 's/^/  /'
    fi
}

# Generate consolidated report
generate_consolidated_report() {
    local success_rate=0
    if [ $TOTAL_SUITES -gt 0 ]; then
        success_rate=$((PASSED_SUITES * 100 / TOTAL_SUITES))
    fi
    
    echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    📊 FINAL RESULTS                         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}Overall Test Suite Results:${NC}"
    echo -e "Total Test Suites: $TOTAL_SUITES"
    echo -e "Passed: ${GREEN}$PASSED_SUITES${NC}"
    echo -e "Failed: ${RED}$FAILED_SUITES${NC}"
    echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"
    
    echo -e "\n${BLUE}Individual Suite Results:${NC}"
    for suite_key in "${!TEST_SUITES[@]}"; do
        local suite_info="${TEST_SUITES[$suite_key]}"
        local suite_name=$(echo "$suite_info" | cut -d: -f1)
        local result="${SUITE_RESULTS[$suite_key]:-NOT_RUN}"
        
        if [[ $result == PASSED:* ]]; then
            local duration=$(echo "$result" | cut -d: -f2)
            echo -e "  ✅ ${GREEN}$suite_name${NC} ($duration)"
        elif [[ $result == FAILED:* ]]; then
            local duration=$(echo "$result" | cut -d: -f2)
            echo -e "  ❌ ${RED}$suite_name${NC} ($duration)"
        else
            echo -e "  ⚠️  ${YELLOW}$suite_name${NC} ($result)"
        fi
    done
    
    # Generate detailed report file
    local report_file="$RESULTS_DIR/consolidated-report.md"
    cat > "$report_file" << EOF
# Comprehensive API Test Suite Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')  
**Test Run ID:** $TEST_TIMESTAMP  
**Base URL:** $BASE_URL

## Summary

- **Total Test Suites:** $TOTAL_SUITES
- **Passed:** $PASSED_SUITES
- **Failed:** $FAILED_SUITES
- **Success Rate:** $success_rate%

## Individual Suite Results

EOF

    for suite_key in "${!TEST_SUITES[@]}"; do
        local suite_info="${TEST_SUITES[$suite_key]}"
        local suite_name=$(echo "$suite_info" | cut -d: -f1)
        local script_name=$(echo "$suite_info" | cut -d: -f2)
        local result="${SUITE_RESULTS[$suite_key]:-NOT_RUN}"
        
        echo "### $suite_name" >> "$report_file"
        echo "" >> "$report_file"
        
        if [[ $result == PASSED:* ]]; then
            local duration=$(echo "$result" | cut -d: -f2)
            echo "- **Status:** ✅ PASSED" >> "$report_file"
            echo "- **Duration:** $duration" >> "$report_file"
            echo "- **Script:** \`$script_name\`" >> "$report_file"
            echo "- **Output:** [\`${suite_key}-output.log\`](./${suite_key}-output.log)" >> "$report_file"
        elif [[ $result == FAILED:* ]]; then
            local duration=$(echo "$result" | cut -d: -f2)
            echo "- **Status:** ❌ FAILED" >> "$report_file"
            echo "- **Duration:** $duration" >> "$report_file"
            echo "- **Script:** \`$script_name\`" >> "$report_file"
            echo "- **Output:** [\`${suite_key}-output.log\`](./${suite_key}-output.log)" >> "$report_file"
        else
            echo "- **Status:** ⚠️ $result" >> "$report_file"
            echo "- **Script:** \`$script_name\`" >> "$report_file"
        fi
        echo "" >> "$report_file"
    done
    
    # Add recommendations
    cat >> "$report_file" << EOF
## Recommendations

EOF

    if [ $FAILED_SUITES -eq 0 ]; then
        cat >> "$report_file" << EOF
🎉 **All tests passed!** The API is functioning correctly and ready for deployment.

### Next Steps:
- Consider running tests in different environments (staging, production-like)
- Set up automated testing in CI/CD pipeline
- Monitor API performance in production
- Consider adding more edge case testing
EOF
    else
        cat >> "$report_file" << EOF
⚠️ **Some tests failed.** Review failed test outputs and fix issues before deployment.

### Immediate Actions Required:
- Review failed test logs in the output files
- Fix failing API endpoints or test configurations  
- Re-run failed test suites after fixes
- Ensure all tests pass before deploying

### Failed Test Suites:
EOF
        for suite_key in "${!SUITE_RESULTS[@]}"; do
            if [[ "${SUITE_RESULTS[$suite_key]}" == FAILED:* ]]; then
                local suite_info="${TEST_SUITES[$suite_key]}"
                local suite_name=$(echo "$suite_info" | cut -d: -f1)
                echo "- $suite_name" >> "$report_file"
            fi
        done
    fi
    
    cat >> "$report_file" << EOF

## Files Generated

- \`master-test-log.txt\` - Master execution log
- \`consolidated-report.md\` - This report
EOF

    for suite_key in "${!TEST_SUITES[@]}"; do
        if [ -f "$RESULTS_DIR/${suite_key}-output.log" ]; then
            echo "- \`${suite_key}-output.log\` - ${TEST_SUITES[$suite_key]%:*} output" >> "$report_file"
        fi
    done
    
    echo -e "\n${GREEN}📄 Detailed report saved to: $report_file${NC}"
    
    if [ $FAILED_SUITES -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}All tests passed! API is ready for deployment.${NC}"
    else
        echo -e "\n⚠️  ${YELLOW}$FAILED_SUITES test suite(s) failed. Review the logs and fix issues.${NC}"
    fi
    
    echo -e "\n${CYAN}Test Results Directory: $RESULTS_DIR${NC}"
    echo -e "${CYAN}View detailed report: cat $report_file${NC}"
}

# Main execution function
main() {
    print_banner
    init_results_directory
    check_prerequisites
    
    echo -e "${BLUE}🚀 Starting Test Execution...${NC}\n"
    
    # Run test suites in logical order
    local execution_order=("auth" "company" "client" "appointment" "integration" "performance")
    
    for suite_key in "${execution_order[@]}"; do
        if [[ -v TEST_SUITES[$suite_key] ]]; then
            run_test_suite "$suite_key"
        fi
    done
    
    # Run any remaining suites not in execution order
    for suite_key in "${!TEST_SUITES[@]}"; do
        if [[ ! " ${execution_order[*]} " =~ " ${suite_key} " ]]; then
            run_test_suite "$suite_key"
        fi
    done
    
    generate_consolidated_report
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Test suite execution completed" >> "$MASTER_LOG"
    
    # Exit with appropriate code
    if [ $FAILED_SUITES -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --list, -l     List available test suites"
        echo "  --suite, -s    Run specific test suite"
        echo ""
        echo "Available test suites:"
        for suite_key in "${!TEST_SUITES[@]}"; do
            local suite_info="${TEST_SUITES[$suite_key]}"
            local suite_name=$(echo "$suite_info" | cut -d: -f1)
            echo "  $suite_key - $suite_name"
        done
        exit 0
        ;;
    --list|-l)
        echo "Available test suites:"
        for suite_key in "${!TEST_SUITES[@]}"; do
            local suite_info="${TEST_SUITES[$suite_key]}"
            local suite_name=$(echo "$suite_info" | cut -d: -f1)
            local script_name=$(echo "$suite_info" | cut -d: -f2)
            echo "  $suite_key: $suite_name ($script_name)"
        done
        exit 0
        ;;
    --suite|-s)
        if [ -z "${2:-}" ]; then
            echo "Error: --suite requires a suite name"
            exit 1
        fi
        suite_to_run="$2"
        if [[ ! -v TEST_SUITES[$suite_to_run] ]]; then
            echo "Error: Unknown test suite '$suite_to_run'"
            echo "Use --list to see available suites"
            exit 1
        fi
        
        print_banner
        init_results_directory
        check_prerequisites
        run_test_suite "$suite_to_run"
        generate_consolidated_report
        exit $?
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac