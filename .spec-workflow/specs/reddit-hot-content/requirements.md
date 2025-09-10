# Requirements Document

## Introduction

Reddit热门内容抓取工作流是一个基于n8n的内容聚合系统，通过前端界面触发执行并展示Reddit热门内容。该功能将集成到现有的信息展示模块中，为用户提供自动化的Reddit内容聚合服务。

该工作流的核心价值在于：
- 自动化Reddit热门内容的抓取和聚合
- 提供格式化的Markdown内容展示
- 支持多个subreddit的同时抓取
- 实时展示抓取状态和结果统计

## Alignment with Product Vision

该功能与信息展示模块的产品愿景完全一致：
- 扩展了信息聚合的数据源，增加了Reddit这一重要的内容平台
- 提供了自动化的工作流触发和管理能力
- 增强了用户对外部数据源的访问和控制能力
- 符合模块化设计理念，可作为其他工作流的参考模板

## Requirements

### Requirement 1: 工作流触发控制

**User Story:** 作为系统用户，我希望能够通过前端界面触发Reddit热门内容抓取工作流，以便获取最新的热门内容。

#### Acceptance Criteria

1. WHEN 用户点击"抓取Reddit热门内容"按钮 THEN 系统 SHALL 发送GET请求到 `https://wendealai.com/webhook/reddithot`
2. WHEN 工作流正在执行时 THEN 系统 SHALL 显示"正在抓取数据..."加载状态
3. WHEN 工作流执行完成 THEN 系统 SHALL 显示成功或失败的状态指示器
4. IF 工作流执行失败 THEN 系统 SHALL 提供重试按钮

### Requirement 2: 内容展示和格式化

**User Story:** 作为系统用户，我希望能够查看格式化的Reddit热门内容，以便快速了解各个社区的热门话题。

#### Acceptance Criteria

1. WHEN 工作流返回成功结果 THEN 系统 SHALL 在主要内容区域渲染telegramMessage字段的Markdown内容
2. WHEN 显示内容时 THEN 系统 SHALL 支持Markdown格式的正确渲染
3. WHEN 内容过长时 THEN 系统 SHALL 提供适当的滚动或分页机制
4. IF 返回的success字段为false THEN 系统 SHALL 显示错误信息而非内容

### Requirement 3: 元数据和统计信息展示

**User Story:** 作为系统用户，我希望能够查看抓取操作的详细统计信息，以便了解数据质量和抓取效果。

#### Acceptance Criteria

1. WHEN 工作流执行完成 THEN 系统 SHALL 在元数据区域显示有效社区数量 (validSubreddits/totalSubreddits)
2. WHEN 显示统计信息时 THEN 系统 SHALL 包含时间过滤器 (timeFilter)、抓取时间 (timestamp) 和消息长度 (messageLength)
3. WHEN 用户需要调试时 THEN 系统 SHALL 提供可折叠的调试信息区域
4. IF 存在请求的社区列表 THEN 系统 SHALL 显示 subredditsRequested 数组内容

### Requirement 4: 错误处理和用户反馈

**User Story:** 作为系统用户，我希望在工作流执行出错时能够获得清晰的错误信息和解决建议，以便快速解决问题。

#### Acceptance Criteria

1. WHEN API请求失败 THEN 系统 SHALL 显示网络错误信息
2. WHEN 工作流返回错误 THEN 系统 SHALL 显示具体的错误原因
3. WHEN 发生错误时 THEN 系统 SHALL 提供重试按钮
4. IF 用户需要技术支持 THEN 系统 SHALL 提供调试信息的导出功能

### Requirement 5: 国际化支持

**User Story:** 作为多语言用户，我希望Reddit工作流界面支持中英文切换，以便使用我熟悉的语言操作。

#### Acceptance Criteria

1. WHEN 用户切换语言 THEN 系统 SHALL 更新所有界面文本为对应语言
2. WHEN 显示错误信息时 THEN 系统 SHALL 使用当前选择的语言
3. WHEN 显示按钮和标签时 THEN 系统 SHALL 使用国际化的文本键
4. IF 内容为英文 THEN 系统 SHALL 保持原始内容不翻译

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Reddit工作流组件应专注于Reddit内容抓取，不包含其他业务逻辑
- **Modular Design**: 工作流触发、状态管理、内容展示应分离为独立组件
- **Dependency Management**: 最小化与其他工作流的耦合，使用通用的工作流接口
- **Clear Interfaces**: 定义清晰的API响应类型和组件属性接口

### Performance
- API请求响应时间应在30秒内完成
- 大量文本内容的渲染应保持流畅，不阻塞UI
- 组件加载时间应在2秒内
- 支持并发多个工作流的执行状态管理

### Security
- 所有API请求必须使用HTTPS协议
- 不在前端存储敏感的API密钥或认证信息
- 对用户输入进行适当的验证和清理
- 遵循CORS策略，确保跨域请求安全

### Reliability
- 网络请求失败时提供自动重试机制（最多3次）
- 组件应能优雅处理API超时和网络中断
- 状态管理应保持一致性，避免竞态条件
- 提供降级方案，在服务不可用时显示友好提示

### Usability
- 界面应遵循现有设计系统的视觉规范
- 加载状态应提供清晰的视觉反馈
- 错误信息应简洁明了，避免技术术语
- 支持键盘导航和无障碍访问
- 响应式设计，支持移动设备访问