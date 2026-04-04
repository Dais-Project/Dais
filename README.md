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

- Powerful Extensibility

  Expand your Agent's capabilities by connecting it to various external tools, enabling it to tackle a much wider range of real-world tasks.

- Flexible Skill Management

  Easily organize and assign specific skills to your Agents, ensuring they always have the perfect toolkit for the job at hand.

- Intuitive Workspace Organization

  Stay organized by switching seamlessly between dedicated workspaces tailored for different projects and scenarios.

- Efficient Multi-Tasking

  Keep things moving by managing and advancing multiple tasks simultaneously without losing track of your progress.

- Secure & Controlled Execution

  Work with peace of mind thanks to robust permission controls that prevent unintended actions and ensure your Agent stays on track.

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
