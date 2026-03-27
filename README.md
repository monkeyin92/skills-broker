# skills-broker

`skills-broker` 是一个 Claude Code-first 的 skills broker v0。它负责把明确的任务请求归一化、从候选能力里做最小范围的发现与排序、准备 handoff，并在 handoff 就绪后结束 broker 阶段。

## 当前范围

当前只覆盖一个明确场景：`webpage -> markdown`。

- 双来源发现：
  - 本地 host skill catalog
  - 录制的 MCP registry 响应
- 本地文件缓存：
  - 对 winner 做基于时间窗口的复用与刷新
- Claude Code host package：
  - 可安装一个最小本地 plugin，用于 smoke test 和 handoff 集成验证

这个仓库当前没有实现真实联网 discovery 作为主路径；主流程依赖本地 seed/fixture 数据，因此常规测试不需要外网。

## 安装

先安装依赖：

```bash
npm ci
```

安装本地 Claude Code package 用这一条命令：

```bash
./scripts/install-claude-code.sh /absolute/path/to/claude-code-plugin
```

脚本会在目标目录生成最小 `.claude-plugin/plugin.json` 和 `skills/webpage-to-markdown/SKILL.md`。

## 测试

```bash
npm test
```

CI 默认也使用 `npm ci` + `npm test`，并且不依赖真实网络 discovery。

## Broker 行为约束

- broker 只负责选路、prepare 和 handoff
- broker 不会追加摘要、总结或额外解释性回答
- handoff 完成后，broker 阶段结束，不会继续代表下游能力回答
