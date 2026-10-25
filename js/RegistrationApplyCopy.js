const { resolveBaseURL } = require('./Global')

const PAID_NOTE = '注册需要付费。'

/** 由 portal API base 推导管理后台根地址（注册 / 申请页）。 */
function managerPublicBase(baseURL) {
    let base = resolveBaseURL(baseURL).replace(/\/$/, '')
    if (base.includes('/portal')) {
        return base.replace('/portal', '/manager')
    }
    return `${base}/wubi/manager`
}

function registerApplyHref(baseURL) {
    return `${managerPublicBase(baseURL)}/#/register-apply`
}

function registerHref(baseURL) {
    return `${managerPublicBase(baseURL)}/#/register`
}

module.exports = {
    PAID_NOTE,
    registerApplyHref,
    registerHref,
}
