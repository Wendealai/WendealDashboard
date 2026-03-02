# Dark Mode 全站修复 TODO

更新时间：2026-03-02  
状态：`in-progress`（Phase 1 实施中）

## 1. 目标与验收标准

目标：彻底修复全站 Dark Mode 视觉错乱、对比度不足、样式冲突和模块间主题不一致问题。

必须满足：

- [ ] 页面级一致性：主站 `src/**` 在 Dark Mode 下无“白底黑字残留块”或“黑底黑字”。
- [ ] 组件级一致性：Ant Design 组件样式不依赖大量 `!important` 强压。
- [ ] 主题体系一致性：全站只保留一套可追踪的主题令牌层（Token Layer）。
- [ ] 回归可量化：每次迭代可通过脚本统计硬编码颜色与 `!important` 持续下降。
- [ ] 可发布标准：关键业务路径在暗色模式下通过冒烟检查（见第 7 节）。

## 2. 当前基线（审计快照）

审计范围：`src` + `apps/sparkery/src`  
统计口径：

- 硬编码颜色（`#hex`、`rgb/rgba`）
- `!important`
- JSX inline style 同行 hex 颜色

当前值（2026-03-02，实施后最新）：

- `TOTAL_COLOR_MATCHES=2732`
- `TOTAL_COLOR_FILES=170`
- `TOTAL_IMPORTANT_MATCHES=929`
- `TOTAL_IMPORTANT_FILES=34`
- `TOTAL_INLINE_HEX_MATCHES=205`
- `TOTAL_INLINE_HEX_FILES=62`

本轮迭代对比（同日基线 `3650 / 1005 / 257`）：

- `Hardcoded color matches: -918`
- `!important matches: -76`
- `Inline style hex lines: -52`

热点文件（按问题密度）：

- `apps/sparkery/src/pages/Sparkery/styles/sparkery-dispatch.css`
- `src/pages/Sparkery/styles/sparkery-dispatch.css`
- `apps/sparkery/src/pages/Sparkery/styles/sparkery-legacy.css`
- `src/pages/Sparkery/styles/sparkery-legacy.css`
- `src/styles/theme.css`

## 3. 修复原则（必须遵守）

- [ ] 不新增硬编码颜色（除图表序列色、品牌资产必须色）。
- [ ] 不新增 `!important`（除第三方组件兼容兜底且必须写注释）。
- [ ] JSX 内颜色值统一替换为语义 token（`var(--token-*)`）。
- [ ] 先“全局壳层”后“业务页面”，避免局部修好后被全局覆盖。
- [ ] 每个修复 PR 必须附带暗色截图或可复现场景说明。

## 4. 分阶段修复清单

### Phase 0：治理与基建（先做）

- [ ] DM-001 建立统一主题规范文档（Token 命名、层级、使用边界）
- [x] DM-002 固化审计脚本：`npm run audit:dark-mode`
- [x] DM-003 在 CI 增加暗色审计门禁（先 warning，后 hard fail）
- [ ] DM-004 建立“允许硬编码白名单”机制（图表/品牌色）
- [ ] DM-005 明确 `apps/sparkery/src` 是否仍为生产路径；若非生产路径，冻结只读

验收：

- [ ] 团队可以用同一命令拿到一致审计结果
- [ ] 新 PR 能看到暗色风险提示

### Phase 1：全局壳层与主题系统

- [ ] DM-101 梳理并合并 `ThemeContext` / `theme.css` / AntD token 的职责边界
- [ ] DM-102 清理全局覆盖冲突：`body.theme-dark` 与 `[data-theme='dark']` 重复规则（进行中）
- [ ] DM-103 统一 Layout 层颜色来源（Header/Sider/Content/Card/Input）（进行中）
- [ ] DM-104 统一 Typography 暗色策略，去掉针对单模块的临时强压规则（进行中）
- [ ] DM-105 统一滚动条、Modal、Drawer、Popover、Tooltip 的暗色表现

验收：

- [ ] 主页框架切换 Dark/Light 无闪烁、无局部反色异常
- [ ] `src/styles/theme.css` 的 `!important` 数量下降 60%+

### Phase 2：高风险业务模块（按优先级）

#### P1 业务核心（优先）

- [ ] DM-201 Sparkery Dispatch 样式重构（进行中）  
       路径：`src/pages/Sparkery/styles/sparkery-dispatch.css`（含 apps 副本）
- [ ] DM-202 Sparkery Legacy 样式债务清理（进行中）  
       路径：`src/pages/Sparkery/styles/sparkery-legacy.css`
- [ ] DM-203 SocialMedia 结果与生成器暗色重构（进行中）  
       路径：`src/pages/SocialMedia/components/ResultPanel.tsx`、`InternationalSocialMediaGeneratorContainer.tsx`
- [ ] DM-204 CleaningInspection 四步页 inline 色值替换  
       路径：`StepCheckIn/Out/TaskOverview/RoomInspection/PreCleanDamage`

验收：

- [ ] P1 模块 Dark Mode 下主要页面无“白卡片突兀”问题
- [ ] P1 模块 inline hex 色值减少 80%+

#### P2 高使用页面

- [ ] DM-205 InformationDashboard + OCR 页面暗色统一
- [ ] DM-206 Tools 工作流容器暗色统一
- [ ] DM-207 Dashboard、RAG、Auth 页面暗色统一

验收：

- [ ] P2 模块通过暗色冒烟路径（第 7 节）

### Phase 3：收尾与硬化

- [ ] DM-301 删除临时兼容补丁与过期暗色 hack
- [ ] DM-302 补齐暗色视觉回归基线（关键页面截图）
- [ ] DM-303 审计门禁从 warning 切换为 fail
- [ ] DM-304 输出“暗色模式维护指南”

验收：

- [ ] `TOTAL_IMPORTANT_MATCHES` 较基线下降 70%+
- [ ] `TOTAL_INLINE_HEX_MATCHES` 较基线下降 85%+

## 5. 任务拆分模板（每个子任务都按此填）

- 目标页面/组件：
- 当前问题（截图/描述）：
- 涉及文件：
- 修复策略（token 替换 / 结构调整 / AntD token 对齐）：
- 风险点：
- 验证步骤：
- 回滚方案：

## 6. 建议迭代节奏（2 周）

- Week 1：Phase 0 + Phase 1 + Phase 2(P1)
- Week 2：Phase 2(P2) + Phase 3

每次合并要求：

- [ ] 执行 `npm run audit:dark-mode`
- [ ] 提交前后对比数据（至少三项统计）
- [ ] 关键页面暗色截图

## 7. 暗色冒烟路径（发布必测）

- [ ] `/` Dashboard
- [ ] `/information-dashboard`
- [ ] `/social-media`
- [ ] `/tools`
- [ ] `/sparkery` 与 Dispatch 相关页
- [ ] `/cleaning-inspection`
- [ ] `/login`、`/register`

设备与断点：

- [ ] Desktop `>=1280px`
- [ ] Tablet `768px`
- [ ] Mobile `375px`

## 8. 已落地工具

暗色审计脚本：

- `npm run audit:dark-mode`
- 可选阈值：  
  `node scripts/dark-mode-audit.mjs --max-color 3000 --max-important 900 --max-inline-hex 250`

---

备注：本文档是执行清单，不是设计稿。所有条目都应最终转化为可审查 PR 与可重复验证结果。
