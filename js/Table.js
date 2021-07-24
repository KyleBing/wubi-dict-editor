class Table{
    constructor(dict, tbody) {
        this.tbody = tbody
        this.dict = dict
    }
    showDict(){
        this.dict.forEach((item, index) => {
            let tr = this.tbody.querySelector('tr.prototype').cloneNode(true)
            tr.querySelector('td.id').innerText = index
            tr.querySelector('td.code').innerText = item.code || ''
            tr.querySelector('td.word').innerText = item.word || ''
            this.tbody.appendChild(tr)
        })
    }
}
export default Table
