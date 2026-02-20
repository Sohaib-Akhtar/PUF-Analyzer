# PUF Analyzer Desktop

A modern Electron desktop application for PUF (Physically Unclonable Function) analysis. It wraps the [dram-puf-cli](../dram-puf-cli) Java tool with a rich GUI, local SQLite database, and an embedded Fastify REST API running fully offline.

![screenshot](6C0B30F3-C937-4EA2-971D-1BEBF74820EA_1_201_a.jpeg)

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Mantine 8, Heroicons
- **Backend**: Electron 37, Node.js, SQLite (better-sqlite3), Fastify 5
- **PUF Analysis**: Java CLI bridge (`dram-puf-cli`) via `child_process`
- **Build Tools**: Vite 7, electron-vite 4, electron-builder
- **Code Quality**: ESLint 9, Prettier

---

## Prerequisites

| Tool | Minimum Version | Recommended | Notes |
|------|----------------|-------------|-------|
| **Node.js** | 18 | 20 LTS+ | [Download](https://nodejs.org/) |
| **npm** | 9 | _(ships with Node)_ | Used as the package manager |
| **Java (JDK)** | 11 | 21 LTS | Required for all PUF analysis operations |
| **Maven** | 3.8 | 3.9+ | Required to build the Java CLI JAR |

### Installing Java

<details>
<summary><strong>Windows</strong></summary>

1. Download and install [Eclipse Temurin JDK](https://adoptium.net/) (recommended) or Oracle JDK.
2. During installation, check **"Set JAVA_HOME variable"** and **"Add to PATH"**.
3. Verify in a new terminal:
   ```powershell
   java -version
   javac -version
   ```
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
# Using Homebrew
brew install openjdk@21

# Link so the system can find it
sudo ln -sfn $(brew --prefix openjdk@21)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Add to your shell profile (~/.zshrc or ~/.bashrc)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH="$JAVA_HOME/bin:$PATH"
```

Verify:
```bash
java -version
```
</details>

<details>
<summary><strong>Linux (Debian / Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install openjdk-21-jdk

# Optional: set default if multiple versions installed
sudo update-alternatives --config java
```

Verify:
```bash
java -version
```
</details>

### Installing Maven

<details>
<summary><strong>Windows</strong></summary>

1. Download the **Binary zip archive** from [maven.apache.org](https://maven.apache.org/download.cgi).
2. Extract to a directory (e.g. `C:\tools\apache-maven-3.9.9`).
3. Add `C:\tools\apache-maven-3.9.9\bin` to your **PATH** environment variable.
4. Verify:
   ```powershell
   mvn -version
   ```

Alternatively, install via [Chocolatey](https://chocolatey.org/):
```powershell
choco install maven
```
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install maven
mvn -version
```
</details>

<details>
<summary><strong>Linux (Debian / Ubuntu)</strong></summary>

```bash
sudo apt install maven
mvn -version
```
</details>

---

## Quick Start

> Both repositories (`dram-puf-cli` and `puf-desktop-gui`) must sit side-by-side in the same parent directory.

```
parent-directory/
├── dram-puf-cli/       # Java CLI tool
└── puf-desktop-gui/    # This project (Electron app)
```

### 1. Clone both repositories

```bash
git clone <dram-puf-cli-repo-url>
git clone <puf-desktop-gui-repo-url>
```

### 2. Build the Java CLI JAR

```bash
cd dram-puf-cli
mvn clean package
```

This produces `target/pufmetrics-1.0-SNAPSHOT.jar` which the Electron app references at runtime.

### 3. Install Node.js dependencies

```bash
cd ../puf-desktop-gui
npm install
```

### 4. Start the app in development mode

```bash
npm run dev
```

This will:
- Build the Electron main process, preload scripts, and React renderer
- Launch the application window with hot reload enabled
- Start the embedded Fastify REST API on a random local port

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the app in development mode with hot reload |
| `npm run build` | Compile all bundles (main, preload, renderer) to `out/` |
| `npm run package` | Package for distribution via electron-builder (output in `dist-electron/`) |
| `npm run lint` | Run ESLint across the project |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without writing |
| `npm run type-check` | Run TypeScript type checking (all projects) |

---

## PUF Backend API

A local Fastify REST server starts automatically with the app. All operations run offline — no external network calls are made.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/metrics/analyze` | Run PUF quality metrics (uniqueness, reliability, etc.) |
| POST | `/api/stable/generate` | Generate stable bit positions |
| POST | `/api/extract/key` | Extract keys from binary dumps |
| POST | `/api/convert/binary` | Convert to binary format |
| POST | `/api/convert/hex` | Convert to hex format |
| POST | `/api/convert/image` | Convert to image format |
| POST | `/api/convert/augment` | Augment data with noise |
| POST | `/api/convert/corrupt` | Corrupt data for testing |
| POST | `/api/convert/fixlf` | Fix line-feed formatting |
| POST | `/api/metrics/nist-average` | Average NIST randomness test results |
| POST | `/api/stable/random` | Generate random test data |
| POST | `/api/stable/repeated` | Generate repeated-pattern test data |
| POST | `/api/files/upload` | Upload and validate PUF reading files |
| GET | `/docs` | Interactive Swagger API documentation |

### File Format

PUF reading files are binary strings consisting of `0` and `1` characters, typically 32 characters per line, with `.txt`, `.bin`, or `.pos` extensions.

Example filenames: `tiva_original_26181245.txt`, `stellaris1_26183504.txt`

---

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # Entry point, window creation
│   ├── ipc/              # IPC handler registration
│   └── api/              # Embedded REST API
│       ├── server.ts     # Fastify server setup
│       ├── routes/       # Route handlers (metrics, convert, extract, etc.)
│       ├── services/     # Java CLI bridge & file validation
│       ├── dto/          # Request/response type definitions
│       └── middleware/   # Validation & error handling
├── renderer/             # React frontend (renderer process)
│   ├── components/       # Reusable UI components (Navbar, Header, Footer, modals)
│   ├── pages/            # Page components (Dashboard, Devices, Analysis)
│   ├── providers/        # React context providers (theme)
│   ├── types/            # TypeScript declarations
│   ├── styles/           # Global CSS / Tailwind
│   └── theme/            # Mantine theme configuration
├── preload/              # Preload scripts (contextBridge API)
├── database/             # SQLite database layer
│   ├── connection.ts     # Database connection & initialization
│   ├── schema.sql        # Table definitions
│   └── services/         # Data access services (devices, readings, files)
└── shared/               # Shared types between processes
```

---

## Database

SQLite is used for local storage — no external database required. The database file is created automatically on first launch.

| Table | Description |
|-------|-------------|
| `devices` | PUF device metadata (name, type, reading count) |
| `puf_readings` | Binary reading data linked to devices |
| `puf_analysis_results` | Stored analysis results and parameters |
| `puf_analysis_files` | File references for each analysis run |

---

## Application Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with quick stats and recent activity |
| **Devices** | Register PUF devices, upload readings, manage data |
| **Analysis** | 12-tab interface for all PUF operations (metrics, key extraction, format conversion, NIST tests, etc.) |

---

## Troubleshooting

### Java / Maven

| Problem | Solution |
|---------|----------|
| `java` not found | Install a JDK (see [Installing Java](#installing-java)) and ensure it's on your PATH |
| `JAVA_HOME` not set | Set it to your JDK installation directory (not the `bin/` folder) |
| `mvn` not found | Install Maven (see [Installing Maven](#installing-maven)) and ensure it's on your PATH |
| Maven build fails | Run `java -version` to confirm JDK 11+ is active; also check you're in `dram-puf-cli/` |

### Node.js / Build

| Problem | Solution |
|---------|----------|
| `npm install` fails | Ensure Node.js 18+ is installed: `node -v` |
| `native module` errors | Run `npm run postinstall` to rebuild native deps (better-sqlite3) for Electron |
| Build fails after code changes | Run `npm run build` to recompile all bundles |
| JAR not found at runtime | Make sure `dram-puf-cli/target/pufmetrics-1.0-SNAPSHOT.jar` exists (run Maven build) |

### Runtime

| Problem | Solution |
|---------|----------|
| API endpoints return 404 | Check the dev console for the server port — it changes each launch |
| Analysis operations error | Ensure the Java CLI JAR was built and `java` is on the PATH |
| Database errors | Delete the database file and restart the app to reinitialize |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please create an issue in the repository.
