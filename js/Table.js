
class Table{
    /**
     *
     * @param yaml yaml 字典表
     * @param display div.display
     */
    constructor(yaml, display) {
        this.display = display
        this.yaml = yaml
        this.trPrototype = this.display.querySelector('tr.prototype')
        this.tablePrototype = this.display.querySelector('table.prototype')
    }
    showDict(){
        let tbody = this.display.querySelector('tbody')
        tbody.innerHTML = ''
        this.yaml.dict.forEach((item, index) => {
            let tr = this.trPrototype.cloneNode(true)
            tr.classList.remove('prototype')
            tr.querySelector('td.id').innerText = index + 1
            tr.querySelector('td.code').innerText = item.code || ''
            tr.querySelector('td.word').innerText = item.word || ''
            tbody.appendChild(tr)
        })
    }

    showDictGroup(){
        this.display.innerHTML = ''
        this.yaml.dictWithGroup.forEach((groupItem, indexGroup) => {
            let table = this.tablePrototype.cloneNode(true)
            table.classList.remove('prototype')
            let tbody = table.querySelector('tbody')
            table.querySelector('thead td').innerText = groupItem.groupName // set group name

            // 内层循环
            let trOrigin = tbody.querySelector('tr.prototype')
            groupItem.dict.forEach((item, index) => {
                let tr = trOrigin.cloneNode(true)
                tr.classList.remove('prototype')
                tr.querySelector('td.id').innerText = index + 1
                tr.querySelector('td.code').innerText = item.code || ''
                tr.querySelector('td.word').innerText = item.word || ''
                tbody.appendChild(tr)
            })
            // 内层循环 - END

            this.display.appendChild(table)
        })
    }
}
export default Table
