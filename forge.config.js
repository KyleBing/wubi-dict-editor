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

const displayName = '五笔码表助手';
const asciiName = 'WubiDictEditor';
// macOS 使用中文 .app 名；Windows / Linux 可执行文件仍用 ASCII，避免安装器与路径问题
const isDarwin = process.platform === 'darwin';
const appName = isDarwin ? displayName : asciiName;
const iconBase = path.join(__dirname, 'assets/img/appIcon/appIcon');
const entitlements = path.join(__dirname, 'entitlements.mac.plist');
const hasAppleCert = Boolean(process.env.APPLE_SIGNING_IDENTITY);

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    appVersion,
    name: appName,
    executableName: appName,
    appBundleId: 'cn.kylebing.wubi-dict-editor',
    appCopyright: 'kylebing@163.com',
    icon: iconBase,
    asar: true,
    overwrite: true,
    extendInfo: {
      CFBundleDisplayName: displayName,
      CFBundleName: displayName,
      CFBundleLocalizations: ['zh_CN', 'en'],
    },
    win32metadata: {
      ProductName: displayName,
      CompanyName: 'kylebing.cn',
      FileDescription: '五笔码表助手 for 小狼毫',
    },
    ...(isDarwin
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
      platforms: ['darwin', 'win32', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        // 避免固定文件名冲突；不用过小的背景图（原 tool_panel_open.png 仅 46x30）
        name: `${displayName}-${appVersion}`,
        overwrite: true,
        format: 'UDZO',
        icon: `${iconBase}.icns`,
        iconSize: 80,
        contents: (opts) => [
          {
            x: 130,
            y: 220,
            type: 'file',
            path: opts.appPath,
            name: `${displayName}.app`,
          },
          { x: 410, y: 220, type: 'link', path: '/Applications' },
        ],
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: asciiName,
        setupIcon: path.join(__dirname, 'assets/img/appIcon/appIcon.ico'),
        authors: 'KyleBing',
        description: '五笔码表管理工具',
        // 安装包显示名仍用中文
        title: displayName,
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'kylebing@163.com',
          homepage: 'https://github.com/KyleBing/wubi-dict-editor',
          icon: path.join(__dirname, 'assets/img/appIcon/appIcon.png'),
          // 与 packagerConfig.executableName（非 darwin）保持一致
          bin: asciiName,
          name: 'wubi-dict-editor',
          productName: displayName,
        },
      },
    },
  ],
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      makeResults.forEach((result) => {
        console.log(`\n✅ [${result.platform}/${result.arch}]`);
        result.artifacts.forEach((artifact) => console.log(`   ${artifact}`));
      });

      if (isDarwin && !hasAppleCert) {
        console.log('\n⚠️  macOS 未配置正式签名（.env 中 APPLE_SIGNING_IDENTITY）');
        console.log('   用户首次打开若被拦截，请任选其一：');
        console.log('   1. 右键 app → 打开');
        console.log(`   2. 终端执行: xattr -cr "/path/to/${displayName}.app"`);
        console.log('   正式分发请配置 .env.example 中的 Apple 签名与公证\n');
      }

      return makeResults;
    },
  },
};
