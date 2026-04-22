# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Package registry / release services:**
- npm registry - 用于检查版本是否已发布以及正式发布包。
  - SDK/Client: npm CLI，经由 `.github/workflows/publish-npm.yml` 里的 `npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}"` 与 `npm publish --provenance --access public`
  - Auth: `NODE_AUTH_TOKEN`（GitHub Actions secret `NPM_TOKEN`）
- npm package execution - `tests/e2e/published-package-smoke.test.ts` 使用 `npm exec --package <tarball> -- skills-broker update ...` 验证已打包产物可直接执行。
  - SDK/Client: npm CLI
  - Auth: Not applicable

**Registry / discovery services:**
- MCP Registry - 代码层只解析本地 JSON 响应文件，不直接发 HTTP 请求；解析逻辑在 `src/sources/mcp-registry.ts`。
  - SDK/Client: `readFile` + JSON 解析，本地输入路径来自 `mcpRegistryFilePath`
  - Auth: Not applicable
- MCP Registry live smoke - 唯一仓库内显式的 HTTP 请求发生在 `.github/workflows/live-discovery-smoke.yml`，用 `curl https://registry.modelcontextprotocol.io/v0.1/servers` 拉取 live 响应，再交给 `src/sources/mcp-registry.ts` 解析。
  - SDK/Client: `curl` + `ts-node/esm`
  - Auth: 无

**Source control / repo truth:**
- Git remote fetch - `src/shared-home/status.ts` 在 `doctor --refresh-remote` / strict repo 校验时执行 `git fetch --quiet <remote>`、`git merge-base`、`git cat-file`，依赖仓库现有远端配置。
  - SDK/Client: Git CLI，经 `node:child_process.execFile`
  - Auth: 使用本地 Git 凭据与远端配置；仓库代码中不保存凭据

**Project hosting metadata:**
- GitHub repository metadata - `package.json` 指向 `git+https://github.com/monkeyin92/skills-broker.git`，`homepage` 与 `bugs.url` 也指向 GitHub。
  - SDK/Client: Not applicable
  - Auth: Not applicable

## Package Registries And Install Sources

**Current seeded acquisition sources:**
- Local skill bundles - `config/host-skills.seed.json` 当前声明的包只有 `baoyu`、`gstack` 两个 `local_skill_bundle`。
- Broker-native package - `config/host-skills.seed.json` 同时声明 `skills_broker` 为 `broker_native`，用于 broker 自带 workflow/能力。
- MCP bundles - `config/mcp-registry.seed.json` 提供 `io.example/*` 占位候选；`src/broker/run.ts` 会在默认打包 seed 文件路径上过滤这些占位命名空间，避免真实运行时把示例数据当可安装目标。

**Supported but not currently seeded:**
- Published npm packages - 类型系统与安装计划支持 `published_package`，映射逻辑在 `src/core/types.ts`、`src/broker/acquisition.ts`；当前 `config/host-skills.seed.json` 未声明任何 `published_package` 候选。

**Install plan mapping:**
- `published_package` -> `package_manager`
- `mcp_bundle` -> `mcp_registry`
- `local_skill_bundle` -> `local_bundle`
- `broker_native` -> `manual_followup`
- 映射实现位于 `src/broker/acquisition.ts`。

## Host Adapter Layer

**Claude Code:**
- 运行适配器: `src/hosts/claude-code/adapter.ts`
- 安装器: `src/hosts/claude-code/install.ts`
- 默认宿主安装路径: `~/.claude/skills/skills-broker`，由 `src/core/types.ts` 与 `src/shared-home/paths.ts` 定义
- Claude plugin manifest 输出: ``<installDirectory>/.claude-plugin/plugin.json``

**Codex:**
- 运行适配器: `src/hosts/codex/adapter.ts`
- 安装器: `src/hosts/codex/install.ts`
- 默认宿主安装路径: `~/.agents/skills/skills-broker`，由 `src/core/types.ts` 与 `src/shared-home/paths.ts` 定义
- Codex ownership manifest 输出: ``<installDirectory>/.skills-broker.json``

**Shared host contract generation:**
- 宿主看到的 `SKILL.md` 文案由 `src/hosts/skill-markdown.ts` 生成。
- 共享 runner / 宿主 runner 由 `src/shared-home/install.ts`、`src/hosts/claude-code/install.ts`、`src/hosts/codex/install.ts` 写入 `bin/run-broker`。

## Data Storage

**Databases:**
- None. 未检测到数据库驱动、ORM 或外部数据库连接配置。

**File Storage:**
- Local filesystem only
  - 共享 broker home 根目录: `~/.skills-broker`，见 `src/shared-home/paths.ts`
  - 共享配置: ``~/.skills-broker/config/host-skills.seed.json``、``~/.skills-broker/config/mcp-registry.seed.json``、``~/.skills-broker/config/maintained-broker-first-families.json``，由 `src/shared-home/install.ts` 复制
  - 共享运行时: ``~/.skills-broker/dist``、``~/.skills-broker/bin/run-broker``
  - 共享状态文件: ``~/.skills-broker/state/broker-cache.json``、``~/.skills-broker/state/acquisition-memory.json``、``~/.skills-broker/state/routing-traces.jsonl``、``~/.skills-broker/state/workflow-sessions.json``、``~/.skills-broker/state/broker-first-gate.json``
  - broker 管理的下游 skill 存放目录: ``~/.skills-broker/downstream/<host>/skills``
  - 宿主 ownership manifest: ``<host-shell>/.skills-broker.json``，实现见 `src/shared-home/ownership.ts`

**Caching:**
- JSON file cache - broker winner cache 默认写到临时目录 `tmpdir()`，若提供共享 home 则写到共享 state 目录；默认逻辑在 `src/broker/run.ts` 与 `src/shared-home/install.ts`。
- Advisory acquisition memory - `src/broker/acquisition-memory.ts` 把已验证 winner 记录到 ``<brokerHome>/state/acquisition-memory.json``。
- Verified downstream manifests - `src/broker/downstream-manifest-source.ts` 在 broker 管理的下游 skill 目录里写 `.skills-broker.json` 作为 advisory replay source。

## Authentication & Identity

**Auth Provider:**
- None for runtime broker routing. 没有 OAuth、session、API token provider 或用户身份系统。
  - Implementation: 运行时只识别 broker host (`claude-code` / `codex`) 与本地 ownership manifest，不做用户鉴权。

**Release auth:**
- npm publish 依赖 GitHub Actions secret `NPM_TOKEN`，注入为 `NODE_AUTH_TOKEN`，见 `.github/workflows/publish-npm.yml`。

## Monitoring & Observability

**Error Tracking:**
- None. 未检测到 Sentry、Datadog、OpenTelemetry、Bugsnag 等第三方接入。

**Logs:**
- 本地 JSONL 路由追踪 - `src/broker/trace-store.ts` 追加写入 ``<brokerHome>/state/routing-traces.jsonl``。
- 本地 doctor / status 诊断 - `src/shared-home/doctor.ts`、`src/shared-home/status.ts` 汇总 acquisition memory、verified downstream manifests、Git shipped proof、peer surface 情况。

## CI/CD & Deployment

**Hosting:**
- Not applicable as a long-running service. 产物是 npm CLI 包，安装后运行在用户本机的 Claude Code / Codex 宿主目录与共享 home 中。

**CI Pipeline:**
- GitHub Actions CI - `.github/workflows/ci.yml`
- GitHub Actions npm publish - `.github/workflows/publish-npm.yml`
- GitHub Actions live discovery smoke - `.github/workflows/live-discovery-smoke.yml`

## Environment Configuration

**Required env vars:**
- 本地开发与测试: Not detected as required. 仓库没有 `.env` 约定，也没有硬编码读取 `.env*`。
- 运行时可选变量:
  - `BROKER_CACHE_FILE`
  - `BROKER_HOST_CATALOG`
  - `BROKER_MCP_REGISTRY`
  - `BROKER_HOME_DIR`
  - `BROKER_CURRENT_HOST`
  - `BROKER_NOW`
  - `BROKER_PACKAGE_SEARCH_ROOTS`
  - `BROKER_INCLUDE_TRACE`
  - `BROKER_DEBUG`
  - `BROKER_TRACE`
- 路径解析隐含依赖:
  - 用户 home 目录，来自 `node:os.homedir()`，见 `src/shared-home/paths.ts`
  - GitHub Actions 发布时的 `NODE_AUTH_TOKEN`

**Secrets location:**
- Runtime secrets: Not applicable
- Publish secret: GitHub Actions secret `NPM_TOKEN` -> `NODE_AUTH_TOKEN`

## Network Interaction

**Direct outbound network paths:**
- Optional Git remote refresh - `src/shared-home/status.ts` 调用 `git fetch`，网络终点由仓库 remote 决定。
- CI-only MCP registry smoke - `.github/workflows/live-discovery-smoke.yml` 访问 `https://registry.modelcontextprotocol.io/v0.1/servers`。
- CI-only npm registry checks and publish - `.github/workflows/publish-npm.yml` 访问 `https://registry.npmjs.org`。

**No direct app-runtime HTTP clients detected:**
- `src/sources/mcp-registry.ts` 只读取本地 JSON 文件。
- `src/hosts/claude-code/adapter.ts` 与 `src/hosts/codex/adapter.ts` 只执行本地 `bin/run-broker`。
- 未检测到 `fetch()`、`axios`、`undici`、`node:http` 形式的业务 HTTP 客户端。

## Webhooks & Callbacks

**Incoming:**
- None. 未检测到 webhook HTTP endpoint、server listener 或 callback URL。

**Outgoing:**
- None in runtime application code. 网络调用仅见 Git CLI、CI `curl`、CI npm publish/check。

---

*Integration audit: 2026-04-22*
