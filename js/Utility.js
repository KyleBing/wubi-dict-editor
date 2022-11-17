function $(selector){
    return document.querySelector(selector)
}

// 抖动 dom 元素
function shakeDom(dom){
    let animateClass = 'shake';
    dom.classList.add('animated');
    dom.classList.add(animateClass);
    setTimeout(()=>{
        dom.classList.remove('animated')
        dom.classList.remove(animateClass)
    }, 250)
}

// 抖动 dom 元素 并 聚焦
function shakeDomFocus(dom){
    let animateClass = 'shake';
    dom.classList.add('animated');
    dom.classList.add(animateClass);
    setTimeout(()=>{
        dom.classList.remove('animated')
        dom.classList.remove(animateClass)
    }, 250)
    dom.focus()
}

// 获取字符串的实际 unicode 长度，如：一个 emoji 表情的正确长度应该为 1
function getUnicodeStringLength(str){
    let wordLength = 0
    for(let letter of str){
        wordLength = wordLength + 1
    }
    return wordLength
}

function log(...obj){
    console.log(...obj)
}

/**
 * 数组乱序算法
 * @param arr
 * @return {*}
 */
function shuffle(arr) {
    let length = arr.length,
        r = length,
        rand = 0;

    while (r) {
        rand = Math.floor(Math.random() * r--);
        [arr[r], arr[rand]] = [arr[rand], arr[r]];
    }
    return arr;
}


// 格式化时间，输出字符串
function dateFormatter(date, formatString) {
    formatString = formatString || 'yyyy-MM-dd hh:mm:ss'
    let dateRegArray = {
        "M+": date.getMonth() + 1,                      // 月份
        "d+": date.getDate(),                           // 日
        "h+": date.getHours(),                          // 小时
        "m+": date.getMinutes(),                        // 分
        "s+": date.getSeconds(),                        // 秒
        "q+": Math.floor((date.getMonth() + 3) / 3), // 季度
        "S": date.getMilliseconds()                     // 毫秒
    }
    if (/(y+)/.test(formatString)) {
        formatString = formatString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }
    for (let section in dateRegArray) {
        if (new RegExp("(" + section + ")").test(formatString)) {
            formatString = formatString.replace(RegExp.$1, (RegExp.$1.length === 1) ? (dateRegArray[section]) : (("00" + dateRegArray[section]).substr(("" + dateRegArray[section]).length)))
        }
    }
    return formatString
}


module.exports = {
    shakeDom, shakeDomFocus, log, getUnicodeStringLength, dateFormatter, shuffle
}
