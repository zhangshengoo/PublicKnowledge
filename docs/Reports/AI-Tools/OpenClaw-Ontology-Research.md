---
title: "OpenClaw + Ontology 深度研究报告"
tags: [openclaw, ontology, ai-agent, skills-system]
domain: "report"
created: 2026-03-18
updated: 2026-03-18
summary: "OpenClaw 开源 AI Agent 平台架构分析，重点研究 Ontology Skill 的实体类型、配置方法和最佳实践"
visibility: public
status: "active"
confidence: "high"
related: []
---

# OpenClaw + Ontology 深度研究报告

> 研究日期: 2026-03-18

---

## 1. OpenClaw 概述

**OpenClaw**（前身为 Clawdbot、Moltbot）是由 **Peter Steinberger** 开发的免费开源自主 AI Agent 平台。

- 2025年11月以 "Clawdbot" 名称发布
- 2026年1月27日因 Anthropic 商标投诉更名为 "Moltbot"，三天后再更名为 "OpenClaw"
- 2026年2月14日，Steinberger 宣布加入 OpenAI，项目移交开源基金会
- NVIDIA 宣布 **NemoClaw**，在 OpenClaw 之上运行 Nemotron 模型和 OpenShell 运行时

### 核心架构

| 组件 | 说明 |
|------|------|
| **Gateway** | 核心服务器，路由消息到各渠道和 Agent |
| **Skills System** | 基于 Markdown 的模块化插件（SKILL.md + YAML frontmatter） |
| **Memory System** | 持久化存储：扁平 Markdown 文件、每日日志、SQLite 数据库 |
| **Agent Files** | SOUL.md（个性身份）、AGENTS.md（运行规则）、TOOLS.md（可用工具） |
| **Multi-channel** | WhatsApp、Telegram、Slack、Discord、Signal、iMessage、IRC、Teams、Matrix 等 20+ 渠道 |
| **Multi-agent** | 将入站渠道/账户/对等方路由到隔离的 Agent |

### 核心能力

- 运行 Shell 命令、控制浏览器、读写文件、管理日历、发送邮件
- 语音唤醒和对话模式（macOS/iOS 唤醒词，Android 持续语音）
- Live Canvas（Agent 驱动的可视化工作区）
- 50+ 集成，覆盖聊天、AI 模型、生产力工具、智能家居
- **ClawHub 市场** 2,857+ 可下载 Skills
- Skills 优先级：workspace > managed/local > bundled

### 环境要求

- Node 24（推荐）或 Node 22 LTS（22.16+）
- 支持的 LLM Provider API Key（Claude、GPT、DeepSeek 等）

---

## 2. Ontology Skill 详解

**Ontology skill** 是一个为 OpenClaw 设计的类型化词汇和约束系统，用于将知识表示为**可验证的图谱**。由 **oswalpalash** 开发，在 ClawHub 上可用。

### 核心概念

Ontology 中的一切都是 **Entity（实体）**，具有类型、属性和与其他实体的关系。每次变更在提交前都会根据类型约束进行验证。

### 支持的实体类型

| 类别 | 类型 |
|------|------|
| Agents & People | Person, Organization |
| Work | Project, Task, Goal |
| Time & Place | Event, Location |
| Information | Document, Message, Thread, Note |
| Resources | Account, Device, Credential |
| Meta | Action, Policy |

### 存储格式

- **图谱数据**: `memory/ontology/graph.jsonl` — 仅追加的 JSONL 文件，存储 create/relate 操作
- **Schema**: `memory/ontology/schema.yaml` — 类型定义和约束规则

### 约束验证

- **必填属性**强制检查
- **枚举验证**（如 Task status 必须为: open, in_progress, blocked, done）
- **关系类型/基数规则**（如 has_owner 为多对一）
- **无环约束**（防止 "blocks" 关系中的循环依赖）
- **时间验证**（Event end >= start）
- **禁止属性**（防止直接存储密钥）

---

## 3. 最佳实践

### 3.1 数据保护
- **始终追加/合并** `graph.jsonl` 和 `schema.yaml` 的变更，**绝不覆盖**
- 这保留了历史记录并避免覆盖先前定义

### 3.2 Schema 设计
- 尽早在 `schema.yaml` 中定义 Schema，将其视为一等公民
- 使用 required 字段和 enums 从一开始就确保数据质量

### 3.3 跨 Skill 集成
- 在每个 Skill 的 SKILL.md frontmatter 中声明 Ontology 读写的前置条件和后置条件
- 使用 Ontology 作为多个 Skill 之间的共享状态

### 3.4 多步骤规划
- 将多步骤计划建模为经过验证的图操作序列
- 每步执行前验证，约束违反时自动回滚

### 3.5 Memory 管理集成
- 保持 `MEMORY.md` 简短且高层次，让 Ontology 处理结构化事实
- Ontology 补充（而非替代）扁平文件记忆系统
- 使用 `memory_search` 进行非结构化回忆，使用 Ontology 查询进行结构化查找

### 3.6 Token 优化
- Prompt caching 可降低约 90% 的重复 token 成本
- 避免不必要的压缩（会使缓存失效）

### 3.7 Skill 契约声明（高级）
高级 Skill 应显式声明其 Ontology 交互：
- **Reads**: Skill 查询的实体类型
- **Writes**: Skill 创建/修改的实体类型
- **Preconditions**: Skill 运行前必须存在的条件
- **Postconditions**: Skill 执行后保证的结果

---

## 4. 配置与设置

### Ontology 初始化

```bash
# 创建 ontology 目录
mkdir -p memory/ontology

# 初始化图谱文件
touch memory/ontology/graph.jsonl
```

### Schema 定义示例

```yaml
# memory/ontology/schema.yaml
types:
  Task:
    required: [title, status]
    status_enum: [open, in_progress, blocked, done]
  Project:
    required: [name]
  Person:
    required: [name]
relations:
  has_owner:
    from: [Project, Task]
    to: [Person]
    cardinality: many-to-one
  blocks:
    from: [Task]
    to: [Task]
    constraints: [acyclic]
```

### CLI 操作

```bash
# 创建实体
python3 scripts/ontology.py create --type Person --props '{"name":"Alice"}'

# 查询实体
python3 scripts/ontology.py query --type Task --where '{"status":"open"}'

# 创建关系
python3 scripts/ontology.py relate --from <id1> --rel has_owner --to <id2>

# 验证图谱
python3 scripts/ontology.py validate
```

### Memory 文件结构

| 文件 | 用途 |
|------|------|
| `SOUL.md` | Agent 个性和身份（基础） |
| `AGENTS.md` | 操作规则和记忆管理 |
| `TOOLS.md` | 可用工具声明 |
| `memory/MEMORY.md` | 长期策展记忆 |
| `workspace/memories/YYYY-MM-DD.md` | 每日日志 |
| `memory/ontology/` | 结构化知识图谱 |

### 调试技巧
在 OpenClaw 会话中运行 `/context list` 来诊断记忆"未保留"的问题。

---

## 5. 核心功能与优势

### 可验证的状态变更
每次实体创建、更新或关系建立都在提交前经过 Schema 验证，防止无效数据进入知识图谱。

### 跨 Skill 可组合性
多个 Skill 可以读写同一个 Ontology，实现复杂的多 Agent 工作流和共享结构化状态。

### 结构化共享记忆
相比扁平 Markdown 记忆文件，Ontology 提供类型化、可查询、有约束的共享记忆。

### 依赖和遍历查询
图结构支持查询如 "X 的依赖是什么？"、"项目 Z 的所有任务"，以及完整的图遍历操作。

### 事务性计划执行
多步操作可事务性地计划和执行，约束违反时自动回滚。

### 安全密钥处理
Ontology 存储密钥引用（Credential 实体），而非原始值。禁止属性约束防止意外存储密钥。

### 因果推理
变更记录为 Action 实体，支持跨 Agent 交互的因果链推理。

---

## 6. 实际应用场景

### 个人知识管理
- 将 ChatGPT 导出处理为结构化知识图谱（案例：提取 49,079 个原子事实和 57 个实体）
- 构建类型化的个人"第二大脑"系统

### 邮件和文档处理
- 处理邮件积压（15,000+ 封），按紧急程度分类，退订垃圾邮件，起草回复
- 从邮件中提取承诺和行动项到 Ontology 实体

### 商业自动化
- 定期拉取 CRM 数据并交付客户健康指标
- 自动化发票处理、报告生成
- 跨 Google、Apple、Outlook 同步日历

### 多 Agent 协调
- 运行专业化 Agent（策略师、开发者、营销、业务分析）通过消息协调
- 共享 Ontology 状态实现跨 Agent 通信

### 偏好和推荐系统
- 构建关系图谱（如"某人偏好素食餐厅，不喜欢嘈杂场所"）
- 基于图谱推理做出上下文推荐

### 项目管理
- 将项目、任务、目标、依赖关系作为类型化实体跟踪
- 强制执行任务依赖的无环约束
- 自动验证工作流转换

---

## 7. 高级功能

### 12 层记忆架构
社区项目提供 12 层记忆系统：
- 3,000+ 事实的知识图谱
- 语义搜索（多语言，7ms GPU）
- 连续性/稳定性插件
- 激活/衰减系统
- 领域 RAG
- Agent 从文件重建自身

### 因果 Action 日志
将 Ontology 变更记录为因果 Action 实体，支持跨 Skill 和会话的因果链推理。

### 多 Agent 编排
使用 [openclaw-mission-control](https://github.com/abhi1693/openclaw-mission-control) 进行 AI Agent 编排仪表板管理。

### 安全注意事项
- ClawHub 自 2026 年 2 月起集成 VirusTotal 扫描
- 安装前始终审查 Skill
- NVIDIA NemoClaw 通过 OpenShell 运行时解决安全问题
- Ontology 的禁止属性约束防止意外存储密钥

---

## 8. 参考资源

### 官方文档
- [OpenClaw Official Docs](https://docs.openclaw.ai/)
- [Getting Started](https://docs.openclaw.ai/start/getting-started)
- [Skills Documentation](https://docs.openclaw.ai/tools/skills)
- [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)

### GitHub 仓库
- [openclaw/openclaw](https://github.com/openclaw/openclaw) — 主仓库
- [openclaw/skills](https://github.com/openclaw/skills) — 所有 ClawHub Skills
- [Ontology SKILL.md](https://github.com/openclaw/skills/blob/main/skills/oswalpalash/ontology/SKILL.md)
- [awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) — 5,400+ Skills

### 教程和指南
- [FreeCodeCamp - OpenClaw Full Tutorial](https://www.freecodecamp.org/news/openclaw-full-tutorial-for-beginners/)
- [Every.to - Comprehensive Guide](https://every.to/guides/claw-school)
- [Towards AI - Complete Tutorial 2026](https://pub.towardsai.net/openclaw-complete-guide-setup-tutorial-2026-14dd1ae6d1c2)
- [DEV Community - Ultimate Guide](https://dev.to/mechcloud_academy/unleashing-openclaw-the-ultimate-guide-to-local-ai-agents-for-developers-in-2026-3k0h)
- [VelvetShark - Memory Masterclass](https://velvetshark.com/openclaw-memory-masterclass)

### 社区与分析
- [Wikipedia - OpenClaw](https://en.wikipedia.org/wiki/OpenClaw)
- [DigitalOcean - What Is OpenClaw](https://www.digitalocean.com/resources/articles/what-is-openclaw)
- [OpenClaw Architecture - Substack](https://ppaolo.substack.com/p/openclaw-system-architecture-overview)
- [Peter Steinberger Blog](https://steipete.me/posts/2026/openclaw)
