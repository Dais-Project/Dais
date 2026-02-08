<div align="center">
    <br />
    <img src="./public/icon.png" alt="Dais Logo" width="160" height="160" />
    <h1>Dais</h1>
    Your <b>D</b>esktop <b>AI</b> <b>S</b>tudio
    <br />
    <br />
</div>

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
