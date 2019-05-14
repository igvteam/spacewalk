class ModalTable {

    constructor(args) {

        this.datasource = args.datasource
        this.selectHandler = args.selectHandler

        const id = args.id
        const title = args.title || ''
        const parent = args.parent ? $(args.parent) : $('body')
        const html = `
        <div id="${id}" class="modal fade">
        
            <div class="modal-dialog modal-xl">
        
                <div class="modal-content">
        
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
        
                    <div class="modal-body">
        
                        <div id="${id}-spinner" class="spinner-border" style="display: none;">
                            <!-- spinner -->
                        </div>
        
                        <div id="${id}-datatable-container">
        
                        </div>
                    </div>
        
                    <div class="modal-footer">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">OK</button>
                    </div>
        
                </div>
        
            </div>
        
        </div>
    `
        const $m = $(html)
        parent.append($m)

        this.$modal = $m
        this.$datatableContainer = $m.find(`#${id}-datatable-container`)
        this.$spinner = $m.find(`#${id}-spinner`)
        const $okButton = $m.find('.modal-footer button:nth-child(2)')

        $m.on('shown.bs.modal', (e) => {
            this.buildTable()
        })

        $m.on('hidden.bs.modal', (e) => {
            $(e.relatedTarget).find('tr.selected').removeClass('selected')
        })

        $okButton.on('click', (e) => {
            const selected = this.getSelectedTableRowsData.call(this, this.$dataTable.$('tr.selected'))
            if (selected && this.selectHandler) {
                this.selectHandler(selected)
            }
        })
    }

    remove() {
        this.$modal.remove()
    }

    setDatasource(datasource) {
        this.datasource = datasource
        this.$datatableContainer.empty()
        this.$table = undefined
    }

    async buildTable () {

        if (!this.$table && this.datasource) {

            this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>')
            this.$datatableContainer.append(this.$table)

            try {
                this.startSpinner()
                const datasource = this.datasource
                const tableData = await datasource.tableData()
                const tableColumns = await datasource.tableColumns()
                const columnFormat = tableColumns.map(c => ({title: c, data: c}))
                const config =
                    {
                        data: tableData,
                        columns: columnFormat,
                        autoWidth: false,
                        paging: true,
                        scrollX: true,
                        scrollY: '400px',
                        scroller: true,
                        scrollCollapse: true
                    }

                this.tableData = tableData
                this.$dataTable = this.$table.dataTable(config)
                this.$table.api().columns.adjust().draw()   // Don't try to simplify this, you'll break it

                this.$table.find('tbody').on('click', 'tr', function () {

                    if ($(this).hasClass('selected')) {
                        $(this).removeClass('selected')
                    } else {
                        $(this).addClass('selected')
                    }

                })

            } catch (e) {

            } finally {
                this.stopSpinner()
            }
        }
    }


    getSelectedTableRowsData($rows) {
        const tableData = this.tableData
        const result = []
        if ($rows.length > 0) {
            $rows.removeClass('selected')
            const api = this.$table.api()
            $rows.each(function () {
                const index = api.row(this).index()
                result.push(tableData[index])
            })
        }
        return result
    }


    startSpinner () {
        if (this.$spinner)
            this.$spinner.show()
    }


    stopSpinner () {
        if (this.$spinner)
            this.$spinner.hide()
    }


}

export default ModalTable
