const path = require('path');
const { readFileSync } = require('fs');

try {
  require('dotenv').config();
} catch {
  // dotenv 为可选依赖，未安装时直接使用系统环境变量
}

const { version: appVersion } = JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

const iconBase = path.join(__dirname, 'assets/img/appIcon/appIcon');
const entitlements = path.join(__dirname, 'entitlements.mac.plist');
const hasAppleCert = Boolean(process.env.APPLE_SIGNING_IDENTITY);

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    appVersion,
    // 使用 ASCII 名称作为 .app / .exe，避免中文路径导致签名与 Gatekeeper 异常
    name: 'WubiDictEditor',
    executableName: 'WubiDictEditor',
    appBundleId: 'cn.kylebing.wubi-dict-editor',
    appCopyright: 'kylebing@163.com',
    icon: iconBase,
    asar: true,
    overwrite: true,
    extendInfo: {
      CFBundleDisplayName: '五笔码表助手',
      CFBundleName: '五笔码表助手',
      CFBundleLocalizations: ['zh_CN', 'en'],
    },
    win32metadata: {
      ProductName: '五笔码表助手',
      CompanyName: 'kylebing.cn',
      FileDescription: '五笔码表助手 for 小狼毫',
    },
    ...(process.platform === 'darwin'
      ? hasAppleCert
        ? {
            osxSign: {
              identity: process.env.APPLE_SIGNING_IDENTITY,
              hardenedRuntime: true,
              entitlements,
              'entitlements-inherit': entitlements,
            },
            ...(process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD
              ? {
                  osxNotarize: {
                    tool: 'notarytool',
                    appleId: process.env.APPLE_ID,
                    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
                    teamId: process.env.APPLE_TEAM_ID,
                  },
                }
              : {}),
          }
        : {
            // 无 Apple 开发者证书：ad-hoc 签名，本机可运行；分发需用户清除隔离属性
            osxSign: {
              identity: '-',
            },
          }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        background: path.join(__dirname, 'assets/img/tool_panel_open.png'),
        format: 'ULFO',
        iconSize: 80,
        contents: [
          { x: 130, y: 220, type: 'file', path: 'WubiDictEditor.app' },
          { x: 410, y: 220, type: 'link', path: '/Applications' },
        ],
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'WubiDictEditor',
        setupIcon: path.join(__dirname, 'assets/img/appIcon/appIcon.ico'),
        authors: 'KyleBing',
        description: '五笔码表管理工具',
        // 安装包显示名仍用中文
        title: '五笔码表助手',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'kylebing@163.com',
          homepage: 'https://github.com/KyleBing/wubi-dict-editor',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {},
    },
  ],
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      makeResults.forEach((result) => {
        console.log(`\n✅ [${result.platform}/${result.arch}]`);
        result.artifacts.forEach((artifact) => console.log(`   ${artifact}`));
      });

      if (process.platform === 'darwin' && !hasAppleCert) {
        console.log('\n⚠️  macOS 未配置正式签名（.env 中 APPLE_SIGNING_IDENTITY）');
        console.log('   用户首次打开若被拦截，请任选其一：');
        console.log('   1. 右键 app → 打开');
        console.log('   2. 终端执行: xattr -cr "/path/to/WubiDictEditor.app"');
        console.log('   正式分发请配置 .env.example 中的 Apple 签名与公证\n');
      }

      return makeResults;
    },
  },
};
