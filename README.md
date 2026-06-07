<div align="center">
    <br />
    <img src="./public/icon.png" alt="Dais Logo" width="160" height="160" />
    <h1>Dais</h1>
    Your <b>D</b>esktop <b>AI</b> <b>S</b>taffs
    <br />
    <a href="./docs/readme/README_zh_CN.md">简体中文</a> |
    English
    <br />
    <br />
</div>

## Screenshot

![mainscreen](./docs/screenshots/mainscreen-en-split.png)

## Quick Start

<p>
  <a href="https://github.com/Dais-Project/Dais/releases/latest">
    <img src="https://img.shields.io/badge/Download-Latest/Release-32CD32?style=for-the-badge&logo=github&logoColor=white" alt="Download Latest Release" height="50">
  </a>
</p>

## Features

- MCP support: Connect more external tools so Agents can handle a wider range of task scenarios
- Skills management: Centrally manage and assign Agent skills so different tasks can use the right capability combination
- Workspace management: Freely switch between multiple workspaces to fit different projects and usage scenarios
- Parallel task handling: Process and manage multiple tasks at the same time for more efficient multitasking
- Multi-Agent collaboration: Dispatch tasks through subtasks to make more efficient use of context

## Links

- [LinuxDO](https://linux.do/)

## Development

### Prerequisites

- uv
- pnpm
- node
- rustup

### Commands

Install dependencies (postinstall will run `nx run-many -t install` for subprojects)
```
pnpm install
```

Start the dev servers
```
pnpm run dev
```

Build all projects
```
pnpm run build
```
