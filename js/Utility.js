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

// ipc 事件类型
const IPC_TYPES = {
    saveFile: 'saveFile',
    readFile: 'readFile',
    showFileContent: 'showFileContent'
}

export {
    shakeDom, shakeDomFocus, IPC_TYPES
}