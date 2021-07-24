
class Table{
    /**
     *
     * @param yaml yaml 字典表
     * @param display div.display
     */
    constructor(yaml, display) {
        this.display = display
        this.yaml = yaml
    }
    showDict(){
        let tbody = this.display.querySelector('tbody')
        let trOrigin = tbody.querySelector('tr.prototype')
        tbody.innerHTML = ''
        this.yaml.dict.forEach((item, index) => {
            let tr = trOrigin.cloneNode(true)
            tr.querySelector('td.id').innerText = index + 1
            tr.querySelector('td.code').innerText = item.code || ''
            tr.querySelector('td.word').innerText = item.word || ''
            tbody.appendChild(tr)
        })
        tbody.removeChild(trOrigin) // 去除 tr.prototype
    }

    showDictGroup(){
        let tableOrigin = this.display.querySelector('table.prototype')
        this.display.innerHTML = ''
        this.yaml.dictWithGroup.forEach((groupItem, indexGroup) => {
            let table = tableOrigin.cloneNode(true)
            let tbody = table.querySelector('tbody')
            table.querySelector('thead td').innerText = groupItem.groupName // set group name

            // 内层循环
            let trOrigin = tbody.querySelector('tr.prototype')
            groupItem.dict.forEach((item, index) => {
                let tr = trOrigin.cloneNode(true)
                tr.querySelector('td.id').innerText = index + 1
                tr.querySelector('td.code').innerText = item.code || ''
                tr.querySelector('td.word').innerText = item.word || ''
                tbody.appendChild(tr)
            })
            tbody.removeChild(trOrigin) // 去除 tr.prototype
            // 内层循环 - END

            this.display.appendChild(table)
        })
        this.display.removeChild(tableOrigin) // 去除 table.prototype
    }
}
export default Table
