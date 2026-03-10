<div align="center">
    <br />
    <img src="../../public/icon.png" alt="Dais 标志" width="160" height="160" />
    <h1>Dais</h1>
    你的桌面 AI 员工
    <br />
    简体中文 |
    <a href="../../README.md">English</a>
    <br />
    <br />
</div>

## 屏幕截图

![主界面](../screenshots/mainscreen-zh_CN-split.png)

## 快速开始

<p>
  <a href="https://github.com/Dais-Project/Dais/releases/latest">
    <img src="https://img.shields.io/badge/Download-Latest/Release-32CD32?style=for-the-badge&logo=github&logoColor=white" alt="下载最新版本" height="50">
  </a>
</p>

## 开发

本项目使用 Nx 来管理全部开发命令，使用 `pnpm` 运行 [`package.json`](package.json) 中提供的脚本。

安装依赖（postinstall 会为子项目执行 `nx run-many -t install`）
```
pnpm install
```

启动开发服务器
```
pnpm run dev
```

构建所有项目
```
pnpm run build
```
