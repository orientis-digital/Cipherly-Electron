# Cipherly Electron (v0.0.1)

[![Security](https://img.shields.io/badge/Security-Zero--Trust-brightgreen)](#cryptographic-architecture)
[![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM%20%7C%20PBKDF2-blue)](#cryptographic-architecture)
[![Platform](https://img.shields.io/badge/Platform-Electron%20%7C%20Linux%20%7C%20Windows-orange)](#building--packaging)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license--attribution)

> **Zero-Trust Client-Side Encryption Suite** — Desktop application built with React 18, Vite, TypeScript, Web Crypto API, and packaged via Electron. Developed by **Orientis Digital**.

---

## 🚀 Key Features

- 🔐 **Zero-Trust Encryption Engine**: Client-side AES-256-GCM authenticated encryption with PBKDF2 key derivation (100,000 iterations). Raw key materials never leave local memory unencrypted.
- 📝 **Encrypted Text Studio**: Text payload encryption/decryption with auto-detecting key matching, base64 payload formatting, and instant clipboard utilities.
- 📁 **File & Folder Encryption**: Drag-and-drop client-side file encryption with local storage options and secure passphrase/key protection.
- 📻 **Channel & Group Key Bundling**: Secure channel key generation, QR code key bundle exports, and encrypted channel broadcasting utilities.
- 🔑 **Key Manager & QR Generator**: Comprehensive key vault for managing master keys, generating fingerprints, exporting QR codes, and importing external keys.
- 📜 **Audit Log & History**: Local tamper-evident activity tracking for encryption, decryption, and key management actions.
- ⚙️ **Vault Security Controls**: Configurable auto-lock timeouts, master password rotation, and local vault reset options.

---

## 🛠️ Tech Stack

- **UI Framework**: React 18 + TypeScript + Vite
- **Desktop Engine**: Electron 29 + electron-builder
- **Styling**: Tailwind CSS + Lucide React Icons
- **Crypto Core**: Native Web Crypto API (`window.crypto.subtle`)
- **State Management**: Encrypted Local Storage & Custom IndexedDB Store

---

## 💻 Development & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Electron Client
```bash
npm run electron:start
```

---

## 📦 Building & Packaging (AppImage / Zip Executable)

We provide an automated, interactive build pipeline script (`./build.sh`) for version bumping, prerequisite verification, static analysis, typechecking, and multi-platform compilation.

```bash
chmod +x ./build.sh
./build.sh
```

### Build Script Capabilities
1. **Version Management**: Interactively keep version or bump Patch, Minor, Major, or enter custom semver strings.
2. **Platform Target Selection (64-bit x64)**:
   - **Linux**: AppImage, `.deb`, `.tar.gz` (output in `./release`)
   - **Windows**: Portable `.zip` executable
3. **Quality & Typechecking Audit**: Code quality audit using `oxlint` and TypeScript compilation (`tsc && tsc -p tsconfig.electron.json --noEmit`).

---

## 🚀 Deployment

Use `deploy.sh` to package and synchronize release artifacts to the remote downloads server:

```bash
chmod +x ./deploy.sh
./deploy.sh          # Deploys current version artifacts & manifests
./deploy.sh --all    # Deploys all artifacts in ./release
```

---

## 📄 License & Attribution

Copyright © 2026 **Orientis Digital**. All rights reserved.
