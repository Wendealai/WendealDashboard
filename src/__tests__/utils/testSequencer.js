const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * 自定义测试执行顺序
   * 优先级：单元测试 > 集成测试 > E2E测试
   * 在同一类型中，按文件名字母顺序排序
   */
  sort(tests) {
    // 按测试类型分组
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

    // 在每个组内按文件名排序
    const sortByPath = (a, b) => a.path.localeCompare(b.path);

    unitTests.sort(sortByPath);
    integrationTests.sort(sortByPath);
    e2eTests.sort(sortByPath);
    otherTests.sort(sortByPath);

    // 返回排序后的测试列表
    return [...unitTests, ...integrationTests, ...e2eTests, ...otherTests];
  }

  /**
   * 确定测试是否应该并行运行
   * E2E测试和集成测试应该串行运行
   */
  allFailedTests(tests) {
    // 失败的测试优先运行
    return tests.sort((a, b) => {
      if (a.duration && b.duration) {
        return a.duration - b.duration; // 快速失败的测试先运行
      }
      return 0;
    });
  }
}

module.exports = CustomSequencer;
