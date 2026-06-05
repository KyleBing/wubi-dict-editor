const DEFAULT_TIP_DURATION = 2000

const TipMixin = {
    data() {
        return {
            tips: [],
            tipTimeoutHandler: null,
            progressTip: '',
        }
    },
    computed: {
        tipDisplayText() {
            if (this.progressTip) {
                return this.progressTip
            }
            return this.tips.map(item => item.message).join(' , ')
        },
    },
    methods: {
        /**
         * @param {string|string[]} message 提示内容，可传数组批量添加
         * @param {number} [duration=2000] 显示时长（毫秒）
         */
        showTip(message, duration = DEFAULT_TIP_DURATION) {
            if (message === undefined || message === null) {
                return
            }
            if (Array.isArray(message)) {
                message.forEach(msg => this.showTip(msg, duration))
                return
            }
            const text = String(message).trim()
            if (!text) {
                return
            }
            this.tips.push({ message: text, duration })
            this._scheduleTipDismiss()
        },
        /** 显示可更新的进度提示，完成后调用 clearProgressTip */
        setProgressTip(message) {
            this.progressTip = message ? String(message) : ''
        },
        clearProgressTip() {
            this.progressTip = ''
        },
        _scheduleTipDismiss() {
            if (this.tipTimeoutHandler || this.tips.length === 0) {
                return
            }
            const { duration } = this.tips[0]
            this.tipTimeoutHandler = setTimeout(() => {
                this.tips.shift()
                this.tipTimeoutHandler = null
                this._scheduleTipDismiss()
            }, duration)
        },
    },
    beforeDestroy() {
        if (this.tipTimeoutHandler) {
            clearTimeout(this.tipTimeoutHandler)
            this.tipTimeoutHandler = null
        }
    },
}

module.exports = { TipMixin, DEFAULT_TIP_DURATION }
