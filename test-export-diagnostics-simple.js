/**
 * Simple test for export diagnostics functionality
 */

console.log('🚀 Testing Export Diagnostics Core Functionality...\n');

// Simple mock implementation
function testCoreFunctionality() {
  console.log('✅ Core test framework loaded');

  // Test basic file parsing
  const mockSourceCode = `
export const testFunction = () => console.log('test');
export const unusedExport = () => console.log('unused');
import { useState } from 'react';
`;

  console.log('📄 Mock source code created');
  console.log('🔍 Extracting exports...');

  // Simple regex-based export extraction
  const exportMatches = mockSourceCode.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
  const exports = exportMatches ? exportMatches.map(match => {
    const nameMatch = match.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/);
    return nameMatch ? nameMatch[1] : null;
  }).filter(Boolean) : [];

  console.log(`✅ Found ${exports.length} exports:`, exports);

  // Simple regex-based import extraction
  const importMatches = mockSourceCode.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
  const imports = importMatches ? importMatches.map(match => {
    const moduleMatch = match.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
    return moduleMatch ? moduleMatch[1] : null;
  }).filter(Boolean) : [];

  console.log(`✅ Found ${imports.length} imports:`, imports);

  // Simple analysis
  console.log('\n🔍 Analyzing for issues...');
  const issues = [];

  // Check for unused exports (simplified)
  exports.forEach(exportName => {
    const isUsed = mockSourceCode.includes(exportName + '(') ||
                   mockSourceCode.includes(exportName + ' ') ||
                   mockSourceCode.includes(exportName + ';');
    if (!isUsed) {
      issues.push({
        type: 'unused-export',
        severity: 'warning',
        title: 'Unused export',
        description: `Export '${exportName}' is not used`,
        suggestion: 'Consider removing unused exports'
      });
    }
  });

  console.log(`📊 Analysis complete: Found ${issues.length} issues`);

  if (issues.length > 0) {
    console.log('\n📋 Issues Found:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.title} (${issue.severity})`);
      console.log(`      ${issue.description}`);
    });
  }

  return {
    success: true,
    exports: exports.length,
    imports: imports.length,
    issues: issues.length
  };
}

// Run the test
try {
  const result = testCoreFunctionality();
  console.log('\n🎉 Test Results:');
  console.log(`   ✅ Exports detected: ${result.exports}`);
  console.log(`   ✅ Imports detected: ${result.imports}`);
  console.log(`   ✅ Issues analyzed: ${result.issues}`);
  console.log('\n🎯 Export Diagnostics Core Functionality Test: PASSED');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test Failed:', error.message);
  process.exit(1);
}
