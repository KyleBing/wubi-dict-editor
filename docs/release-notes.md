## 下载说明

| 系统 | 下载文件 | 说明 |
|------|----------|------|
| **macOS Apple Silicon**（M1/M2/M3/M4） | `五笔码表助手-darwin-arm64-*.zip` | 解压后打开 `五笔码表助手.app` |
| **macOS Intel** | `五笔码表助手-darwin-x64-*.zip` | 解压后打开 `五笔码表助手.app` |
| **Windows 64 位** | `WubiDictEditor-*-Setup.exe`（推荐）或 `WubiDictEditor-win32-x64-*.zip` | Setup 为安装包；zip 为绿色版 |
| **Linux** | `*.deb` 或 `WubiDictEditor-linux-x64-*.zip` | Debian/Ubuntu 用 deb；其他发行版可用 zip |

## macOS 无法打开时

当前 mac 包为 ad-hoc 签名（未配置 Apple 开发者证书）。若提示「无法打开」或「已损坏」：

1. 右键 App → **打开**
2. 或在终端执行：

```bash
xattr -cr 五笔码表助手.app
```
