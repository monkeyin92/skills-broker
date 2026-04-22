# AGENTS.md

## Repo Instructions

- 用中文交流。
- 开始任何 GSD phase 之前，先读取 `.planning/PROJECT.md`、`.planning/REQUIREMENTS.md`、`.planning/ROADMAP.md`、`.planning/STATE.md`。
- 这个仓库是 brownfield 项目；产品真相优先来自 `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md`、`docs/superpowers/` 与 `.planning/codebase/`，不要把它当成 greenfield 重新定义。
- 保持 host shell 的 coarse broker-first boundary：宿主只能判断 `broker_first` / `handle_normally` / `clarify_before_broker`，不能在入口处选择具体 skill、package 或 workflow 赢家。
- 修改 operator-facing wording 时，同步检查 `README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 与宿主生成文案，避免多语言或多表面 truth 漂移。
- 当前产品优先级是把 `website QA` 及相关 family proof loop 做成可信默认入口，同时保持 adoption health 绿色真相与 shared broker home 的跨宿主复用价值。
- 任何重新打开 query-native migration、package-vs-leaf identity migration、或在默认入口闭环前泛化 maintained-family schema 的提议，都必须先说明为什么现有 sequencing 失效。
