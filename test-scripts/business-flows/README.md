# Business Flow Test Suite

Comprehensive business flow tests for the Clients+ backend that simulate real UI user journeys.

## Overview

This test suite contains 52 comprehensive business flow tests organized into 6 categories, covering all major business operations and user journeys in the Clients+ system.

## Test Categories

### 1. Client Journey Flows (10 tests)
Tests that simulate complete client lifecycles from initial contact to ongoing relationship management.

| Test | Description |
|------|-------------|
| `01-new-client-registration-to-followup` | New client registration → profile completion → first appointment → follow-up |
| `02-client-search-view-history-book-confirm` | Client search → view history → book appointment → receive confirmation |
| `03-bulk-client-import-segment-campaign` | Client import → bulk update → segment creation → targeted campaign |
| `04-vip-client-onboarding-premium-service` | VIP client onboarding → premium service booking → loyalty rewards |
| `05-client-complaint-resolution-survey` | Client complaint → resolution → satisfaction survey |
| `06-walk-in-client-quick-registration` | Walk-in client → quick registration → immediate service |
| `07-client-referral-reward-tracking` | Client referral → reward tracking → network growth |
| `08-client-data-export-analysis-import` | Client data export → analysis → re-import with updates |
| `09-inactive-client-reactivation-campaign` | Inactive client → reactivation campaign → return booking |
| `10-client-deletion-archival-gdpr` | Client deletion → data archival → GDPR compliance |

### 2. Appointment Lifecycle Flows (10 tests)
Tests that cover the complete appointment management lifecycle from booking to completion.

| Test | Description |
|------|-------------|
| `01-search-book-confirm-remind-complete-invoice` | Search availability → book → confirm → remind → complete → invoice |
| `02-recurring-appointment-series-management` | Recurring appointment setup → series management → modification |
| `03-group-booking-participant-attendance` | Group booking → participant management → attendance tracking |
| `04-emergency-appointment-staff-reallocation` | Emergency appointment → staff reallocation → client notification |
| `05-appointment-conflict-resolution-rebooking` | Appointment conflict → resolution → rebooking |
| `06-no-show-tracking-penalty-analysis` | No-show tracking → penalty application → pattern analysis |
| `07-waiting-list-cancellation-auto-rebooking` | Waiting list → cancellation → auto-rebooking |
| `08-multi-service-appointment-resource-allocation` | Multi-service appointment → duration calculation → resource allocation |
| `09-appointment-package-usage-renewal` | Appointment package → usage tracking → renewal |
| `10-calendar-sync-external-booking-conflict` | Calendar sync → external booking → conflict prevention |

### 3. Financial Transaction Flows (10 tests)
Tests that validate financial operations, accounting, and reporting functionality.

| Test | Description |
|------|-------------|
| `01-create-accounts-transfer-reconcile-reports` | Create accounts → transfer funds → reconcile → generate reports |
| `02-invoice-creation-payment-receipt` | Invoice creation → payment collection → receipt generation |
| `03-expense-tracking-category-tax` | Expense tracking → category allocation → tax calculation |
| `04-pos-sale-payment-split-reconciliation` | POS sale → payment split → tip allocation → cash drawer reconciliation |
| `05-subscription-billing-auto-renewal` | Subscription billing → auto-renewal → failed payment retry |
| `06-refund-processing-inventory-accounting` | Refund processing → inventory adjustment → accounting update |
| `07-deposit-collection-service-final-payment` | Deposit collection → service completion → final payment |
| `08-multi-currency-exchange-settlement` | Multi-currency transaction → exchange rate → settlement |
| `09-financial-audit-discrepancy-correction` | Financial audit → discrepancy detection → correction |
| `10-end-of-day-closing-report-prep` | End-of-day closing → report generation → next day prep |

### 4. Inventory & POS Flows (10 tests)
Tests that validate inventory management, point-of-sale operations, and stock control.

| Test | Description |
|------|-------------|
| `01-product-creation-pricing-inventory-tracking` | Product creation → pricing → inventory receipt → stock tracking |
| `02-pos-sale-inventory-deduction-reorder` | POS sale → inventory deduction → reorder alert → purchase order |
| `03-product-bundle-component-auto-deduction` | Product bundle → component tracking → sale → auto-deduction |
| `04-inventory-transfer-branch-availability` | Inventory transfer → branch allocation → availability update |
| `05-stock-take-variance-adjustment` | Stock take → variance report → adjustment → investigation |
| `06-product-promotion-discount-margin` | Product promotion → discount application → margin analysis |
| `07-supplier-order-receipt-quality-stock` | Supplier order → receipt → quality check → stock update |
| `08-product-return-inspection-restock` | Product return → inspection → restock or disposal |
| `09-low-stock-alert-auto-order-payment` | Low stock alert → auto-order → receipt → payment |
| `10-barcode-scan-quick-sale-inventory` | Barcode scan → quick sale → inventory update → receipt |

### 5. Staff Management Flows (10 tests)
Tests that validate staff operations, scheduling, and performance management.

| Test | Description |
|------|-------------|
| `01-staff-onboarding-schedule-appointments-review` | Staff onboarding → schedule setup → first appointments → performance review |
| `02-schedule-creation-conflict-publication` | Schedule creation → conflict check → publication → modification |
| `03-leave-request-approval-adjustment-coverage` | Leave request → approval → schedule adjustment → coverage |
| `04-commission-calculation-bonus-payment` | Commission calculation → performance bonus → payment processing |
| `05-training-scheduling-attendance-certification` | Training scheduling → attendance → certification → skill update |
| `06-staff-availability-assignment-workload` | Staff availability → appointment assignment → workload balance |
| `07-multi-location-schedule-sync-travel` | Multi-location staff → schedule sync → travel time calculation |
| `08-performance-tracking-goals-promotion` | Performance tracking → goal setting → review → promotion |
| `09-staff-deactivation-reassignment-transfer` | Staff deactivation → reassignment → knowledge transfer |
| `10-emergency-coverage-notification-acceptance` | Emergency coverage → notification → acceptance → schedule update |

### 6. Additional Business Flows (12 tests)
Tests that cover specialized business operations and integration scenarios.

| Test | Description |
|------|-------------|
| `01-business-setup-branch-service-configuration` | Business setup → branch creation → service configuration → go-live |
| `02-multi-branch-resource-sharing-reporting` | Multi-branch operation → resource sharing → consolidated reporting |
| `03-marketing-campaign-targeting-roi` | Marketing campaign → client targeting → execution → ROI analysis |
| `04-service-package-pricing-promotion-tracking` | Service package creation → pricing → promotion → sale tracking |
| `05-loyalty-program-accumulation-redemption` | Loyalty program → point accumulation → redemption → balance tracking |
| `06-whatsapp-integration-messaging-tracking` | WhatsApp integration → automated messaging → response tracking |
| `07-report-scheduling-generation-distribution` | Report scheduling → generation → distribution → archival |
| `08-data-backup-disaster-recovery-verification` | Data backup → disaster recovery → restoration → verification |
| `09-integration-setup-testing-monitoring` | Integration setup → testing → monitoring → troubleshooting |
| `10-compliance-audit-report-action-resolution` | Compliance audit → report generation → action items → resolution |
| `11-customer-feedback-analysis-improvement` | Customer feedback collection → analysis → service improvement |
| `12-seasonal-booking-capacity-optimization` | Seasonal booking patterns → capacity planning → resource optimization |

## Quick Start

### Prerequisites

1. Ensure the Clients+ backend server is running:
   ```bash
   cd /Users/ahmed/Documents/Clients+_2.0/clients+_2.0/clients-plus-backend
   npm start
   ```

2. Verify API health:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

### Running Tests

#### Run All Tests
```bash
./run-all-business-flows.sh
```

#### Run Specific Category
```bash
./run-all-business-flows.sh --category "Client Journey"
./run-all-business-flows.sh --category "Appointment Lifecycle"
./run-all-business-flows.sh --category "Financial Transactions"
./run-all-business-flows.sh --category "Inventory & POS"
./run-all-business-flows.sh --category "Staff Management"
./run-all-business-flows.sh --category "Additional Business Flows"
```

#### Run Single Test
```bash
./run-all-business-flows.sh --single "01-new-client-registration-to-followup"
```

#### Run with Parallel Execution
```bash
./run-all-business-flows.sh --parallel
```

#### List All Available Tests
```bash
./run-all-business-flows.sh --list
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `-c, --category CATEGORY` | Run tests for specific category only |
| `-p, --parallel` | Run tests in parallel (where possible) |
| `-s, --single TEST_NAME` | Run single test by name |
| `-l, --list` | List all available tests |
| `--no-cleanup` | Skip cleanup on failure |
| `--report-only` | Generate report from existing results |
| `-h, --help` | Show help message |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL for API | `http://localhost:3000/api/v1` |
| `PARALLEL_EXECUTION` | Enable parallel execution | `false` |
| `CLEANUP_ON_FAILURE` | Cleanup test data on failure | `true` |
| `REPORT_DIR` | Report output directory | `./reports` |

## Test Features

### Realistic User Simulation
- **User Delays**: Simulates realistic user interaction delays
- **Processing Time**: Mimics server processing delays
- **Error Handling**: Graceful handling of API failures
- **Data Validation**: Comprehensive response validation

### Comprehensive Coverage
- **API Integration**: Tests all major API endpoints
- **Data Relationships**: Validates data consistency across entities
- **Business Logic**: Tests complex business rules and workflows
- **Edge Cases**: Covers error conditions and boundary scenarios

### Reporting and Analytics
- **Detailed Reports**: HTML and Markdown reports with execution details
- **Timing Metrics**: Response times and duration tracking
- **Success Rates**: Pass/fail statistics and trend analysis
- **Error Analysis**: Detailed error reporting and debugging information

### Test Data Management
- **Dynamic Generation**: Realistic test data generation
- **Entity Tracking**: Automatic cleanup of created entities
- **Isolation**: Each test runs independently
- **Reusability**: Shared utilities across test categories

## Architecture

### Shared Components

#### `shared/api-client.sh`
- HTTP client with authentication
- Request/response logging
- Error handling and retries
- JWT token management

#### `shared/test-data-generator.sh`
- Realistic test data generation
- Bulk data creation utilities
- Random data generators
- Cleanup script generation

#### `shared/test-helpers.sh`
- Test execution framework
- Assertion utilities
- Entity lifecycle management
- Report generation

### Test Structure

Each test follows a consistent structure:

```bash
#!/bin/bash
# Load shared utilities
source "$SCRIPT_DIR/../shared/test-helpers.sh"

# Initialize test
init_test "$TEST_NAME" "$TEST_DESCRIPTION"

# Test steps
step1() { /* implementation */ }
step2() { /* implementation */ }

# Main execution
main() {
    if step1; then
        step2
        # additional steps
    fi
    cleanup_created_entities
    finish_test
}

main "$@"
```

### Data Flow Validation

Tests validate:
- **Request Format**: Proper JSON structure and required fields
- **Response Format**: Expected response structure and data types
- **Business Rules**: Domain-specific validation and constraints
- **State Changes**: Entity state transitions and side effects
- **Integration Points**: Cross-system data consistency

## Reports

Test execution generates comprehensive reports in the `reports/` directory:

### Report Types

1. **Execution Summary** (`business_flow_report_YYYYMMDD_HHMMSS.md`)
   - Overall test results and statistics
   - Category-wise breakdown
   - Performance metrics
   - Test environment details

2. **Detailed Log** (`detailed_log_YYYYMMDD_HHMMSS.log`)
   - Complete test execution log
   - API request/response details
   - Error messages and stack traces
   - Timing information

### Report Metrics

- **Success Rate**: Percentage of passed tests
- **Execution Time**: Total and per-test execution time
- **API Performance**: Response times and throughput
- **Error Analysis**: Failure patterns and root causes

## Best Practices

### Running Tests

1. **Clean Environment**: Start with a fresh test environment
2. **Stable API**: Ensure backend services are stable and responsive
3. **Sequential First**: Run tests sequentially initially to identify issues
4. **Parallel Carefully**: Use parallel execution only for independent tests
5. **Monitor Resources**: Watch system resources during execution

### Troubleshooting

1. **Check API Health**: Verify backend is running and responding
2. **Review Logs**: Check detailed logs for specific error messages
3. **Verify Data**: Ensure test data is properly created and cleaned up
4. **Network Issues**: Check for connectivity or timeout problems
5. **Permissions**: Verify API authentication and authorization

### Extending Tests

1. **Follow Patterns**: Use existing test structure and shared utilities
2. **Add Validation**: Include comprehensive response validation
3. **Handle Errors**: Graceful error handling and recovery
4. **Clean Up**: Proper entity cleanup and resource management
5. **Document**: Clear test descriptions and step documentation

## Technical Requirements

### Dependencies
- `bash` (4.0+)
- `curl` 
- `jq` (JSON processor)
- `bc` (calculator for numeric operations)
- `date` (with timezone support)

### System Requirements
- Unix-like operating system (Linux, macOS)
- Network access to API endpoints
- Sufficient disk space for reports and logs
- Memory for parallel execution (if enabled)

## Contributing

When adding new business flow tests:

1. Follow the existing naming convention
2. Use shared utilities for common operations
3. Include comprehensive validation steps
4. Add proper cleanup procedures
5. Update this README with test descriptions

## Support

For issues with business flow tests:

1. Check the detailed execution logs
2. Verify API endpoint availability
3. Review test data requirements
4. Ensure proper environment setup
5. Contact the QA team for assistance

---

**Total Business Flow Tests: 52**
**Categories: 6**
**Estimated Execution Time: 15-45 minutes (depending on parallel execution)**
**Last Updated: $(date)**