# Comprehensive API Test Suite

A comprehensive test suite for all API endpoints in the clients-plus-backend application. This test suite covers authentication, authorization, CRUD operations, business workflows, performance, and security testing.

## 🧪 Test Suites

### Core API Tests
- **`auth-comprehensive-test.sh`** - Authentication flow tests (registration, login, token management, role-based access)
- **`company-branch-comprehensive-test.sh`** - Company and branch management tests (profile, settings, working hours)
- **`client-comprehensive-test.sh`** - Client management tests (CRUD, search, filtering, bulk operations)
- **`appointment-comprehensive-test.sh`** - Appointment system tests (scheduling, availability, status management)

### Specialized Tests
- **`integration-test.sh`** - End-to-end business workflow tests
- **`performance-test.sh`** - Performance benchmarks and load testing
- **`security-test.sh`** - Security vulnerability and compliance tests

### Master Runner
- **`run-all-comprehensive-tests.sh`** - Master test runner that executes all test suites

## 🚀 Quick Start

### Prerequisites
1. **API Server Running**: Ensure the backend server is running
   ```bash
   npm run dev
   ```

2. **Dependencies**: Make sure you have `curl` installed
   ```bash
   # macOS
   brew install curl
   
   # Ubuntu/Debian
   sudo apt-get install curl
   ```

3. **Test Database**: Ensure you have a clean test database or the tests will create temporary data

### Running All Tests
```bash
cd test-scripts
./run-all-comprehensive-tests.sh
```

### Running Individual Test Suites
```bash
# Authentication tests
./auth-comprehensive-test.sh

# Company management tests  
./company-branch-comprehensive-test.sh

# Client management tests
./client-comprehensive-test.sh

# Appointment system tests
./appointment-comprehensive-test.sh

# Integration workflow tests
./integration-test.sh

# Performance benchmarks
./performance-test.sh

# Security tests
./security-test.sh
```

### Running Specific Test Suite via Master Runner
```bash
# List available test suites
./run-all-comprehensive-tests.sh --list

# Run specific suite
./run-all-comprehensive-tests.sh --suite auth
./run-all-comprehensive-tests.sh --suite performance
```

## 📊 Test Coverage

### 1. Authentication Tests (`auth-comprehensive-test.sh`)
- **User Registration**: With/without company, validation, duplicates
- **Login Flow**: Credentials validation, company association, error handling
- **Token Management**: JWT verification, refresh, expiration, invalidation
- **Profile Management**: Get/update user profile, authorization
- **Password Security**: Change password, reset requests, strength validation
- **Role-Based Access**: Admin vs staff permissions, privilege escalation prevention
- **Security**: SQL injection, XSS prevention, brute force protection

**Coverage**: ~45 test cases

### 2. Company/Branch Tests (`company-branch-comprehensive-test.sh`)
- **Company CRUD**: Profile management, settings, subscription details
- **Branch Management**: Create, update, delete branches, multi-branch support
- **Settings Configuration**: Working hours, business rules, preferences
- **Staff/Service Assignment**: Resource allocation across branches
- **Data Consistency**: Settings persistence, count accuracy
- **Performance**: Response times for management operations

**Coverage**: ~35 test cases

### 3. Client Management Tests (`client-comprehensive-test.sh`)
- **Client CRUD**: Create, read, update, delete with full/minimal data
- **Search & Filtering**: Text search, status filters, pagination, sorting
- **Bulk Operations**: Import, export, bulk updates
- **Duplicate Detection**: Email/phone/name matching, prevention
- **Statistics**: Client analytics, demographic data
- **Data Validation**: Email formats, phone numbers, required fields
- **Performance**: Large dataset handling, search optimization

**Coverage**: ~40 test cases

### 4. Appointment Tests (`appointment-comprehensive-test.sh`)
- **Availability Management**: Slot checking, bulk availability, conflicts
- **CRUD Operations**: Create, update, cancel appointments
- **Status Workflow**: Confirm → Check-in → Start → Complete flow
- **Rescheduling**: Time suggestions, reschedule operations
- **Calendar Views**: Staff schedules, client history, analytics
- **Bulk Operations**: Mass appointment creation, conflict detection
- **Business Rules**: No-show handling, completion tracking

**Coverage**: ~35 test cases

### 5. Integration Tests (`integration-test.sh`)
- **Company Onboarding**: Complete setup workflow from registration to configuration
- **Service Setup**: Category creation, service configuration, staff assignment
- **Booking Journey**: End-to-end appointment booking process
- **Multi-Branch Operations**: Cross-branch functionality and data consistency
- **Data Relationships**: Ensuring data integrity across related entities

**Coverage**: ~20 test cases

### 6. Performance Tests (`performance-test.sh`)
- **Response Times**: Single request benchmarks (< 2s threshold)
- **Concurrent Load**: Multiple simultaneous requests (< 5s threshold)  
- **Large Datasets**: Handling 50+ records efficiently
- **Complex Queries**: Filtering, sorting, date ranges performance
- **Sustained Load**: Extended testing periods
- **Consistency**: Response time variance analysis
- **Resource Usage**: Memory and CPU efficiency

**Coverage**: ~15 test cases

### 7. Security Tests (`security-test.sh`)
- **Authentication Security**: Token validation, session management
- **Authorization**: Role-based access control, privilege escalation prevention
- **Input Validation**: XSS, SQL injection, buffer overflow protection
- **Data Exposure**: Sensitive information leakage prevention
- **HTTP Security**: Headers, CORS configuration
- **Rate Limiting**: DoS protection, abuse prevention
- **Session Security**: Token invalidation, refresh security

**Coverage**: ~25 test cases

## 📈 Test Results

### Output Format
Each test suite generates:
- **Console Output**: Real-time pass/fail status with colored indicators
- **Log Files**: Detailed execution logs with timestamps
- **Result Files**: Summary statistics and recommendations
- **Consolidated Report**: Master report when using the main runner

### Success Criteria
- **Individual Tests**: HTTP status codes and response content validation
- **Performance Tests**: Response time thresholds and consistency metrics
- **Security Tests**: Proper error handling and access control validation
- **Overall Suite**: All critical paths must pass, performance within thresholds

### Sample Output
```
🧪 Authentication Flow Tests
========================================
✅ PASS: Company registration and owner creation
✅ PASS: Update company profile  
✅ PASS: User login with valid credentials
❌ FAIL: Invalid credentials handling
✅ PASS: Token verification

📊 FINAL RESULTS
Total Tests: 45
Passed: 44
Failed: 1
Success Rate: 98%
```

## 🔧 Configuration

### Environment Variables
Tests use these environment variables (can be set in test scripts):
- `BASE_URL`: API base URL (default: `http://localhost:3000/api/v1`)
- `TEST_EMAIL_PREFIX`: Unique prefix for test emails
- `TEST_PASSWORD`: Standard password for test accounts

### Thresholds
Performance test thresholds can be adjusted in `performance-test.sh`:
```bash
SINGLE_REQUEST_THRESHOLD=2000    # 2 seconds
CONCURRENT_REQUEST_THRESHOLD=5000 # 5 seconds  
LOAD_TEST_THRESHOLD=10000        # 10 seconds
```

### Test Data
- Tests create temporary data with unique identifiers
- Cleanup procedures remove test data after completion
- Some tests may create persistent data for cross-suite validation

## 🛠 Troubleshooting

### Common Issues

#### Server Not Running
```
❌ Server is not responding at http://localhost:3000/api/v1
```
**Solution**: Start the development server with `npm run dev`

#### Permission Denied
```
bash: ./auth-comprehensive-test.sh: Permission denied
```
**Solution**: Make scripts executable with `chmod +x *.sh`

#### Database Connection Issues
```
❌ Failed to setup test environment - no auth token
```
**Solution**: Check database connection and ensure migrations are applied

#### Rate Limiting
Some tests may trigger rate limiting. Wait a few minutes and retry.

### Debug Mode
Add debug output to any script by setting:
```bash
set -x  # Add this line to enable debug mode
```

### Test Data Conflicts
If tests fail due to existing data conflicts:
1. Use a clean test database
2. Clear test data manually
3. Check for orphaned test records

## 📝 Extending Tests

### Adding New Test Cases
1. **Individual Tests**: Add test cases to existing suite files
2. **New Endpoints**: Create new test functions in appropriate suite
3. **New Suite**: Create new `.sh` file and add to master runner

### Test Structure Template
```bash
test_new_feature() {
    print_test_header "TESTING NEW FEATURE"
    
    local response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X GET "$BASE_URL/new-endpoint" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    run_test "Test description" "200" "$response"
}
```

### Master Runner Integration
To add a new test suite to the master runner, update the `TEST_SUITES` array:
```bash
declare -A TEST_SUITES=(
    # ... existing suites
    ["newsuite"]="New Suite Description:new-suite-test.sh"
)
```

## 📊 Metrics & Reporting

### Test Metrics Tracked
- **Pass/Fail Rates**: Overall success percentages
- **Response Times**: Performance benchmarks
- **Coverage**: API endpoint coverage analysis  
- **Security Score**: Security test compliance
- **Regression Detection**: Comparison with previous runs

### Report Generation
The master runner generates:
- **Markdown Reports**: Detailed test results with recommendations
- **Log Aggregation**: Combined logs from all test suites
- **Trend Analysis**: Performance and reliability trends over time

## 🔐 Security Considerations

### Test Data Security
- Use isolated test environments
- Avoid production data in tests
- Clean up sensitive test data after completion

### API Security Validation
- Authentication bypass attempts
- Authorization boundary testing
- Input sanitization verification
- Data exposure prevention checks

## 📚 Best Practices

### Running Tests
1. **Pre-run**: Ensure clean environment and running services
2. **Isolation**: Run tests in dedicated test environment
3. **Monitoring**: Watch for resource usage and performance impact
4. **Post-run**: Review all failed tests and performance metrics

### Test Maintenance
1. **Regular Updates**: Update tests as API evolves
2. **Performance Baselines**: Adjust thresholds based on infrastructure
3. **Security Updates**: Add new security test cases as threats evolve
4. **Documentation**: Keep test documentation current

---

## 🎯 Summary

This comprehensive test suite provides:
- **215+ test cases** across 7 test suites
- **Full API coverage** including edge cases and error conditions
- **Performance benchmarks** with configurable thresholds
- **Security validation** against common vulnerabilities
- **Integration testing** for complete business workflows
- **Automated reporting** with detailed analysis and recommendations

Run `./run-all-comprehensive-tests.sh` to execute the complete test suite and validate your API implementation.