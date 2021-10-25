const {IS_IN_DEVELOP} = require("./Global")

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

function log(...obj){
    console.log(...obj)
}

module.exports = {
    shakeDom, shakeDomFocus, log
}
