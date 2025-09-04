const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Custom test execution order
   * Priority: Unit tests > Integration tests > E2E tests
   * Within the same type, sort by filename alphabetically
   */
  sort(tests) {
    // Group by test type
    const unitTests = [];
    const integrationTests = [];
    const e2eTests = [];
    const otherTests = [];

    tests.forEach(test => {
      const testPath = test.path;

      if (
        testPath.includes('/__tests__/e2e/') ||
        testPath.includes('.e2e.test.')
      ) {
        e2eTests.push(test);
      } else if (
        testPath.includes('/__tests__/integration/') ||
        testPath.includes('.integration.test.')
      ) {
        integrationTests.push(test);
      } else if (
        testPath.includes('/__tests__/') ||
        testPath.includes('.test.')
      ) {
        unitTests.push(test);
      } else {
        otherTests.push(test);
      }
    });

    // Sort by filename within each group
    const sortByPath = (a, b) => a.path.localeCompare(b.path);

    unitTests.sort(sortByPath);
    integrationTests.sort(sortByPath);
    e2eTests.sort(sortByPath);
    otherTests.sort(sortByPath);

    // Return sorted test list
    return [...unitTests, ...integrationTests, ...e2eTests, ...otherTests];
  }

  /**
   * Determine if tests should run in parallel
   * E2E tests and integration tests should run serially
   */
  allFailedTests(tests) {
    // Failed tests run first
    return tests.sort((a, b) => {
      if (a.duration && b.duration) {
        return a.duration - b.duration; // Fast-failing tests run first
      }
      return 0;
    });
  }
}

module.exports = CustomSequencer;
