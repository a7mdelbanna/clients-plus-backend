#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  errors: string[];
  duration: number;
}

class ComprehensiveAPITester {
  private results: TestResult[] = [];
  private baseUrl = 'http://localhost:3000/api/v1';
  private authToken = '';
  private testCompanyId = '';
  private testBranchId = '';

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive API Test Suite');
    console.log('==========================================\n');

    const testSuites = [
      { name: 'Authentication', script: './auth-test.sh' },
      { name: 'Company Management', script: './company-test.sh' },
      { name: 'Branch Management', script: './branch-test.sh' },
      { name: 'Client Management', script: './client-test.sh' },
      { name: 'Staff Management', script: './staff-test.sh' },
      { name: 'Services', script: './service-test.sh' },
      { name: 'Appointments', script: './appointment-test.sh' },
      { name: 'Inventory', script: './inventory-test.sh' },
      { name: 'Financial', script: './financial-test.sh' },
      { name: 'Integration Workflows', script: './integration-test.sh' },
      { name: 'Performance Benchmarks', script: './performance-test.sh' },
      { name: 'Security Tests', script: './security-test.sh' }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.script);
    }

    this.generateReport();
  }

  private async runTestSuite(name: string, script: string): Promise<void> {
    console.log(`\n📋 Running ${name} Test Suite...`);
    const startTime = Date.now();

    try {
      const result = await this.executeScript(script);
      const duration = Date.now() - startTime;

      this.results.push({
        suite: name,
        passed: result.passed,
        failed: result.failed,
        total: result.total,
        errors: result.errors,
        duration
      });

      console.log(`✅ ${name}: ${result.passed}/${result.total} passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        suite: name,
        passed: 0,
        failed: 1,
        total: 1,
        errors: [error instanceof Error ? error.message : String(error)],
        duration
      });
      console.log(`❌ ${name}: Failed to execute (${duration}ms)`);
    }
  }

  private async executeScript(script: string): Promise<{ passed: number; failed: number; total: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', [script], { 
        cwd: path.dirname(__filename),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const lines = stdout.split('\n');
        const passed = lines.filter(line => line.includes('✅') || line.includes('PASS')).length;
        const failed = lines.filter(line => line.includes('❌') || line.includes('FAIL')).length;
        const total = passed + failed;
        const errors = stderr ? [stderr] : [];

        resolve({ passed, failed, total, errors });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private generateReport(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = `test-results-${timestamp}`;
    
    fs.ensureDirSync(reportDir);

    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);

    const report = `# Comprehensive API Test Report

## Summary
- **Total Tests**: ${totalTests}
- **Passed**: ${totalPassed}
- **Failed**: ${totalFailed}
- **Success Rate**: ${((totalPassed / totalTests) * 100).toFixed(2)}%
- **Total Duration**: ${totalDuration}ms

## Test Suite Results

${this.results.map(result => `
### ${result.suite}
- **Status**: ${result.failed === 0 ? '✅ PASSED' : '❌ FAILED'}
- **Tests**: ${result.passed}/${result.total} passed
- **Duration**: ${result.duration}ms
${result.errors.length > 0 ? `- **Errors**: \n${result.errors.map(error => `  - ${error}`).join('\n')}` : ''}
`).join('\n')}

## Recommendations

${totalFailed > 0 ? `
⚠️ **Action Required**: ${totalFailed} test(s) failed
- Review failed test logs for detailed error information
- Fix failing endpoints before deployment
- Re-run tests to ensure fixes work correctly
` : `
🎉 **All tests passed!**
- API is functioning correctly
- Ready for deployment
- Consider running performance tests under load
`}

---
*Report generated on ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(path.join(reportDir, 'summary.md'), report);

    console.log('\n==========================================');
    console.log('📊 TEST SUMMARY');
    console.log('==========================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    console.log(`Duration: ${totalDuration}ms`);
    console.log(`Report saved to: ${reportDir}/`);

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ComprehensiveAPITester();
  tester.runAllTests().catch(console.error);
}

export { ComprehensiveAPITester };