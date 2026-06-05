const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const WEASEL_DEPLOYER = 'WeaselDeployer.exe'
const WINDOWS_RIME_ROOTS = [
    'C:/Program Files/Rime',
    'C:/Program Files (x86)/Rime',
]

function fileExists(filePath) {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    } catch {
        return false
    }
}

function dirExists(dirPath) {
    try {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
    } catch {
        return false
    }
}

function getDeployerPath(execDir) {
    return path.join(execDir, WEASEL_DEPLOYER)
}

function isValidWeaselExecDir(execDir) {
    return Boolean(execDir) && fileExists(getDeployerPath(execDir))
}

function parseWeaselVersion(folderName) {
    const match = folderName.match(/(\d+(?:\.\d+)+)/)
    if (!match) {
        return null
    }
    return match[1].split('.').map(part => parseInt(part, 10))
}

function compareVersionParts(a, b) {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        const av = a[i] || 0
        const bv = b[i] || 0
        if (av !== bv) {
            return av - bv
        }
    }
    return 0
}

function listWeaselInstallDirs(rimeRoot) {
    if (!dirExists(rimeRoot)) {
        return []
    }
    let entries
    try {
        entries = fs.readdirSync(rimeRoot, { withFileTypes: true })
    } catch {
        return []
    }
    return entries
        .filter(entry => entry.isDirectory() && /weasel/i.test(entry.name))
        .map(entry => path.join(rimeRoot, entry.name))
        .filter(isValidWeaselExecDir)
}

function pickLatestWeaselDir(candidates) {
    if (candidates.length === 0) {
        return null
    }
    return candidates.slice().sort((dirA, dirB) => {
        const versionA = parseWeaselVersion(path.basename(dirA))
        const versionB = parseWeaselVersion(path.basename(dirB))
        if (versionA && versionB) {
            const cmp = compareVersionParts(versionA, versionB)
            if (cmp !== 0) {
                return cmp
            }
        }
        return fs.statSync(getDeployerPath(dirB)).mtimeMs - fs.statSync(getDeployerPath(dirA)).mtimeMs
    })[candidates.length - 1]
}

function normalizeConfiguredExecDir(configDir) {
    if (!configDir || !dirExists(configDir)) {
        return null
    }
    if (isValidWeaselExecDir(configDir)) {
        return configDir
    }
    return pickLatestWeaselDir(listWeaselInstallDirs(configDir))
}

function findWeaselDeployerViaWhere() {
    try {
        const output = execSync('where WeaselDeployer.exe', {
            encoding: 'utf8',
            windowsHide: true,
        })
        const deployerPath = output
            .split(/\r?\n/)
            .map(line => line.trim())
            .find(Boolean)
        if (deployerPath && fileExists(deployerPath)) {
            const execDir = path.dirname(deployerPath)
            return isValidWeaselExecDir(execDir) ? execDir : null
        }
    } catch {
        return null
    }
    return null
}

function discoverLatestWeaselExecDir() {
    const candidates = []
    WINDOWS_RIME_ROOTS.forEach(root => {
        candidates.push(...listWeaselInstallDirs(root))
    })
    return pickLatestWeaselDir(candidates)
}

function resolveRimeExecDirWin(configRimeExecDir) {
    const configured = normalizeConfiguredExecDir(configRimeExecDir)
    if (configured) {
        return configured
    }

    const fromPath = findWeaselDeployerViaWhere()
    if (fromPath) {
        return fromPath
    }

    return discoverLatestWeaselExecDir()
}

function getMacRimeExecDir() {
    const squirrelDir = path.join('/Library/Input Methods/Squirrel.app', 'Contents/MacOS')
    const squirrelBin = path.join(squirrelDir, 'Squirrel')
    if (fileExists(squirrelBin)) {
        return squirrelDir
    }
    return squirrelDir
}

function getRimeExecDir(platform, configRimeExecDir = '') {
    switch (platform) {
        case 'darwin':
            return getMacRimeExecDir()
        case 'win32':
            return resolveRimeExecDirWin(configRimeExecDir)
        default:
            return null
    }
}

module.exports = {
    WEASEL_DEPLOYER,
    WINDOWS_RIME_ROOTS,
    isValidWeaselExecDir,
    normalizeConfiguredExecDir,
    resolveRimeExecDirWin,
    getRimeExecDir,
    discoverLatestWeaselExecDir,
}
