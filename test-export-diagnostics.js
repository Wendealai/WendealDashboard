/**
 * Export Diagnostics Test Script
 * Quick test to verify the export diagnostics functionality
 */

import { fileScanner } from './src/features/export-diagnostics/services/fileScanner.js';
import { analyzer } from './src/features/export-diagnostics/services/analyzer.js';

async function testExportDiagnostics() {
  console.log('🚀 Starting Export Diagnostics Test...\n');

  try {
    // Test 1: File Scanner
    console.log('📁 Testing File Scanner...');
    const scanOptions = {
      includePatterns: ['src/**/*.{ts,tsx}'],
      excludePatterns: ['node_modules/**', 'dist/**', '**/*.test.*'],
      maxFileSize: 1024 * 1024, // 1MB
      concurrentLimit: 5,
    };

    const scanResult = await fileScanner.scan(process.cwd(), scanOptions);
    console.log(`✅ Scanned ${scanResult.files.length} files`);
    console.log(`📊 Found ${scanResult.issues.length} initial issues\n`);

    // Test 2: Analyzer
    console.log('🔍 Testing Analyzer...');
    const analysisReport = await analyzer.analyze(scanResult.files);
    console.log(`✅ Analysis completed`);
    console.log(`📈 Health Score: ${Math.round(100 - (analysisReport.summary.errors * 2 + analysisReport.summary.warnings))}%`);
    console.log(`🔴 Errors: ${analysisReport.summary.errors}`);
    console.log(`🟡 Warnings: ${analysisReport.summary.warnings}`);
    console.log(`🔵 Info: ${analysisReport.summary.info}`);
    console.log(`📁 Files affected: ${analysisReport.summary.filesAffected}\n`);

    // Test 3: Top Issues
    console.log('🎯 Top Issues by Type:');
    analysisReport.summary.topIssueTypes.slice(0, 5).forEach((type, index) => {
      console.log(`  ${index + 1}. ${type.type}: ${type.count} issues`);
    });
    console.log('');

    // Test 4: Performance Metrics
    console.log('⚡ Performance Metrics:');
    console.log(`   Scan Time: ${analysisReport.performance.scanTime}ms`);
    console.log(`   Files/Second: ${analysisReport.performance.filesPerSecond.toFixed(1)}`);
    console.log(`   Memory Usage: ${(analysisReport.performance.memoryUsage / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Error Rate: ${(analysisReport.performance.errorRate * 100).toFixed(2)}%\n`);

    // Test 5: Recommendations
    if (analysisReport.recommendations.length > 0) {
      console.log('💡 Top Recommendations:');
      analysisReport.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`      ${rec.description}`);
      });
      console.log('');
    }

    console.log('🎉 Export Diagnostics Test Completed Successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`   ✅ File Scanner: ${scanResult.files.length} files processed`);
    console.log(`   ✅ Analyzer: ${analysisReport.summary.totalIssues} issues detected`);
    console.log(`   ✅ Performance: ${analysisReport.performance.scanTime}ms scan time`);
    console.log(`   ✅ Recommendations: ${analysisReport.recommendations.length} suggestions provided`);

    return {
      success: true,
      scanResult,
      analysisReport,
    };

  } catch (error) {
    console.error('❌ Test Failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
if (require.main === module) {
  testExportDiagnostics()
    .then((result) => {
      if (result.success) {
        console.log('\n🎯 Test passed! Export Diagnostics is ready to use.');
        process.exit(0);
      } else {
        console.error('\n💥 Test failed. Please check the implementation.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { testExportDiagnostics };
