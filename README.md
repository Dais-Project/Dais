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

## Development

This project uses Nx to manage all the development commands, use `pnpm` to run the available scripts in [`package.json`](package.json).

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
