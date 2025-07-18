# PUF Analyzer Desktop

A modern Electron desktop application for PUF (Physically Unclonable Function) analysis built with React, TypeScript, and Tailwind CSS.

## Tech Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS, Mantine UI, heroicons
- **Backend**: Electron, Node.js, SQLite (better-sqlite3)
- **Build Tools**: Vite, electron-vite, electron-builder
- **Development Tools**: ESLint, Prettier

## Prerequisites

- Node.js (v18 or higher)
- PNPM package manager

## Installation

1. Clone the repository:
```bash
git clone
cd puf-desktop-gui
```

2. Install dependencies:
```bash
pnpm install
```

## Development

Start the development server:

```bash
pnpm dev
```

This will:
- Start the Electron main process
- Launch the React development server
- Enable hot reload for both processes
- Open the application window

## Build

### Build for Development
```bash
pnpm build
```

### Package for Distribution
```bash
pnpm package
```

This will create distributable packages in the `dist-electron` directory.

## Project Structure

```
src/
├── main/                 # Main process code
│   ├── index.ts         # Main process entry point
│   └── ipc/             # IPC handlers
├── renderer/            # Renderer process code
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── providers/      # Context providers
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   ├── styles/         # Global styles
│   └── theme/          # Mantine theme configuration
├── preload/            # Preload scripts
├── database/           # Database related code
│   ├── connection.ts   # Database connection
│   ├── schema.sql      # Database schema
│   ├── migrations/     # Database migrations
│   └── services/       # Database services
└── shared/             # Shared utilities and types
```

## Database

The application uses SQLite with the following schema:

- **Users**: Store user information
- **Devices**: Store PUF device information
- **Files**: Store file metadata and paths

Database migrations are automatically applied on application startup.

## Security

The application implements several security measures:

- **Context Isolation**: Enabled in renderer process
- **Node Integration**: Disabled in renderer process
- **Content Security Policy**: Strict CSP headers
- **Secure IPC**: All communication through secure IPC channels
- **External Navigation**: Blocked and opened in external browser

## Navigation

The application includes a sidebar navigation with the following sections:

- **Dashboard**: Overview and statistics
- **Devices**: Manage PUF devices

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please create an issue in the repository.
