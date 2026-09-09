const FONT_SIZE_DEFAULT = 13
const FONT_SIZE_MIN = 12
const FONT_SIZE_MAX = 16

function normalizeFontSize(fontSize) {
    const size = Number(fontSize)
    if (!Number.isFinite(size)) {
        return FONT_SIZE_DEFAULT
    }
    return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)))
}

function systemPrefersDark() {
    return typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function isDarkTheme(theme) {
    switch (theme) {
        case 'black':
            return true
        case 'white':
            return false
        case 'auto':
        default:
            return systemPrefersDark()
    }
}

function applyTheme(theme) {
    const root = document.documentElement
    root.classList.remove('theme-auto', 'theme-dark', 'theme-white')
    switch (theme) {
        case 'black':
            root.classList.add('theme-dark')
            break
        case 'white':
            root.classList.add('theme-white')
            break
        case 'auto':
        default:
            root.classList.add('theme-auto')
            break
    }
}

function applyFontSize(fontSize) {
    document.documentElement.style.setProperty('--fz-main', `${normalizeFontSize(fontSize)}px`)
}

function applyAppearance(config) {
    if (!config) {
        return
    }
    applyTheme(config.theme)
    applyFontSize(config.fontSize)
}

module.exports = {
    FONT_SIZE_DEFAULT,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX,
    normalizeFontSize,
    systemPrefersDark,
    isDarkTheme,
    applyTheme,
    applyFontSize,
    applyAppearance,
}
