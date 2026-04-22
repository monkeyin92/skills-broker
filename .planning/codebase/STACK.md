# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript - 主源码与测试代码都位于 `src/` 与 `tests/`，通过 `tsconfig.json` / `tsconfig.build.json` 编译为 ESM JavaScript。

**Secondary:**
- Bash - 宿主安装与共享 home 更新脚本位于 `scripts/install-claude-code.sh`、`scripts/update-shared-home.sh`，安装器还会在 `src/shared-home/install.ts`、`src/hosts/claude-code/install.ts`、`src/hosts/codex/install.ts` 中生成运行脚本。
- JSON - 种子配置与契约数据位于 `config/host-skills.seed.json`、`config/mcp-registry.seed.json`、`config/maintained-broker-first-families.json`，测试夹具位于 `tests/fixtures/`。
- Markdown - 面向宿主的 skill 文案模板和发布说明来自 `README.md`、`README.zh-CN.md`，宿主 skill 内容由 `src/hosts/skill-markdown.ts` 生成。

## Runtime

**Environment:**
- Node.js ESM runtime - `package.json` 声明 `"type": "module"`，编译目标为 `ES2022`，模块系统为 `NodeNext`，见 `package.json` 与 `tsconfig.json`。
- Node.js version baseline - 仓库未用 `.nvmrc` 或 `engines` 固定版本；CI 与发布工作流统一使用 Node.js 22，见 `.github/workflows/ci.yml`、`.github/workflows/publish-npm.yml`、`.github/workflows/live-discovery-smoke.yml`。

**Package Manager:**
- npm - 仓库使用 `package-lock.json`，发布与 CI 均调用 `npm ci`、`npm publish`。
- 版本来源 - npm 版本未在仓库中单独固定，随 Node.js 22 环境提供。
- Lockfile: present (`package-lock.json`, lockfileVersion 3)

## Frameworks

**Core:**
- 自定义 Node CLI broker runtime - 入口在 `src/bin/skills-broker.ts` 与 `src/cli.ts`，路由核心在 `src/broker/run.ts`。
- 宿主适配层 - Claude Code 适配器在 `src/hosts/claude-code/adapter.ts`，Codex 适配器在 `src/hosts/codex/adapter.ts`，共享安装路径解析在 `src/shared-home/paths.ts`。

**Testing:**
- Vitest `^1.5.7` - Node 环境测试运行器，配置在 `vitest.config.ts`，测试文件匹配 `tests/**/*.test.ts`。

**Build/Dev:**
- TypeScript `^5.5.2` - 通过 `node ./node_modules/typescript/bin/tsc -p tsconfig.build.json` 构建，见 `package.json`。
- ts-node `^10.9.1` - 仅用于 `.github/workflows/live-discovery-smoke.yml` 中直接加载 `src/sources/mcp-registry.ts` 做 live smoke。
- GitHub Actions - CI、npm 发布、MCP registry live smoke 分别定义在 `.github/workflows/ci.yml`、`.github/workflows/publish-npm.yml`、`.github/workflows/live-discovery-smoke.yml`。

## Key Dependencies

**Critical:**
- `typescript` `^5.5.2` - 唯一正式构建工具，产物输出到 `dist/`，见 `package.json`、`tsconfig.build.json`。
- `vitest` `^1.5.7` - 覆盖 broker、CLI、宿主安装、共享 home、integration 与 e2e smoke，测试目录见 `tests/`。
- `@types/node` `^22.5.3` - 该项目大量依赖 Node 内建模块类型，如 `node:fs/promises`、`node:child_process`、`node:path`。
- `ts-node` `^10.9.1` - 支撑工作流内的 TypeScript 直接执行，不参与最终 npm 运行时。

**Infrastructure:**
- Node built-ins only - 运行时代码未声明任何第三方生产依赖；`src/` 主要依赖 `node:fs/promises`、`node:path`、`node:os`、`node:child_process`、`node:url`、`node:util`、`node:crypto`、`node:timers/promises`。
- Git CLI - `src/shared-home/status.ts` 通过 `git rev-parse`、`git fetch`、`git merge-base`、`git cat-file` 做 repo 状态诊断。

## Build And Test Commands

**Repository commands:**
```bash
npm ci                    # 安装开发依赖；CI 和发布工作流都使用它
npm run build             # 编译到 dist/ 并给 dist/bin/skills-broker.js 添加 shebang
npm test                  # 运行 Vitest
npm test -- --run         # CI / publish 使用的非 watch 测试模式
npm pack --json           # 生成 npm tarball；见 tests/e2e/published-package-smoke.test.ts
node dist/bin/skills-broker.js update
node dist/bin/skills-broker.js doctor
node dist/bin/skills-broker.js remove
```

**Helper scripts:**
- `scripts/install-claude-code.sh` - 先 `npm run build`，再调用 `dist/hosts/claude-code/install.js` 安装最小 Claude Code plugin。
- `scripts/update-shared-home.sh` - 先 `npm run build`，再运行 `node dist/bin/skills-broker.js update ...`。

## Configuration

**Environment:**
- 运行时没有 `.env` 文件约定。仓库根目录 `rg --files -g '.env*'` 未检测到任何 `.env*` 文件。
- broker CLI 使用环境变量注入运行参数，入口解析位于 `src/cli.ts`；共享 runner 与宿主 runner 会设置 `BROKER_CACHE_FILE`、`BROKER_HOST_CATALOG`、`BROKER_MCP_REGISTRY`、`BROKER_HOME_DIR`、`BROKER_CURRENT_HOST`、`BROKER_NOW`、`BROKER_INCLUDE_TRACE`，并读取 `BROKER_DEBUG` / `BROKER_TRACE`、`BROKER_PACKAGE_SEARCH_ROOTS`。
- 发布工作流仅在 GitHub Actions 中使用 `NODE_AUTH_TOKEN`，见 `.github/workflows/publish-npm.yml`。

**Build:**
- `package.json` - 包名、版本、bin、发布包含文件、脚本。
- `tsconfig.json` - 开发编译配置，包含 `src` 与 `tests`。
- `tsconfig.build.json` - 生产构建配置，仅编译 `src` 到 `dist/`。
- `vitest.config.ts` - Node 测试环境与测试文件匹配规则。
- `config/host-skills.seed.json` - 宿主能力目录与 workflow 种子。
- `config/mcp-registry.seed.json` - MCP registry 种子输入，当前内容是 `io.example/*` 占位数据。
- `config/maintained-broker-first-families.json` - maintained family 与 broker-first 边界例子。

## Published Artifacts

**CLI and runtime output:**
- `dist/bin/skills-broker.js` - npm bin 入口，`package.json.bin.skills-broker` 指向这里。
- `dist/cli.js` - broker CLI 逻辑入口，runner 脚本通过它执行 `runBrokerCli`。
- `dist/broker/**`、`dist/core/**`、`dist/hosts/**`、`dist/shared-home/**`、`dist/sources/**` - 编译后的运行时代码。

**Packaged files:**
- `package.json.files` 只包含 `config`、`dist`、`README.md`、`README.zh-CN.md`、`LICENSE`，因此 npm 发布产物以这些目录和文件为准。
- `tests/e2e/published-package-smoke.test.ts` 明确用 `npm pack --json` 生成 tarball，再用 `npm exec --package <tarball>` 验证 `skills-broker update` 可安装共享运行时。
- 仓库根目录当前还存在历史 tarball `skills-broker-0.3.3.tgz`；它是现有仓库文件，不是 `package.json` 发布白名单之外的额外发布机制。

## Platform Requirements

**Development:**
- 需要 Node.js 22 兼容环境才能与 CI / 发布环境保持一致，依据 `.github/workflows/ci.yml`。
- 需要本地 npm CLI；辅助脚本 `scripts/install-claude-code.sh`、`scripts/update-shared-home.sh` 会通过 `npm_execpath` 或 Node 安装目录推导 npm CLI 路径。
- 需要 Git CLI 才能运行 `doctor --refresh-remote` 或严格状态校验，见 `src/shared-home/status.ts`。

**Production:**
- 该仓库的“生产形态”是本地安装的 npm CLI 包，而不是常驻服务。默认共享运行时目录是 `~/.skills-broker`，默认 Claude Code 壳目录是 `~/.claude/skills/skills-broker`，默认 Codex 壳目录是 `~/.agents/skills/skills-broker`，见 `src/shared-home/paths.ts` 与 `src/core/types.ts`。
- 共享 broker home 由 `src/shared-home/install.ts` 安装，内部包含 `config/`、`dist/`、`bin/run-broker`、`state/`。

---

*Stack analysis: 2026-04-22*
