class FilteredModalTable {

    constructor(args) {

        this.referenceGenome = undefined;

        this.datasource = args.datasource

        this.selectHandler = args.selectHandler

        this.pageLength = args.pageLength || 10

        if (args.selectionStyle) {
            this.select = { style: args.selectionStyle }
        } else {
            this.select = true;
        }

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

        if (this.api) {
            this.api.destroy()
        }

        if (this.$datatableContainer) {
            this.$datatableContainer.empty()
        }

        this.$modal.remove()
    }

    removeTable() {

        if (this.api) {
            this.api.destroy()
        }

        this.$datatableContainer.empty()
    }

    setDatasource(datasource) {

        if (this.api) {
            this.api.destroy()
        }

        this.$datatableContainer.empty()

        this.datasource = datasource
    }

    async buildTable () {

        let $table = this.$datatableContainer.find('table');

        if (0 === $table.length && this.datasource) {

            // $table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>')
            $table = $('<table class="display"></table>')
            this.$datatableContainer.append($table)

            try {

                this.startSpinner()

                this.tableData = await this.datasource.tableData()

                const tableColumns = await this.datasource.tableColumns()

                const config =
                    {
                        data: this.tableData,
                        columns: tableColumns.map(c => ({title: c, data: c})),
                        pageLength: this.pageLength,
                        select: this.select,
                        autoWidth: false,
                        paging: true,
                        scrollX: true,
                        scrollY: '400px',
                        scroller: true,
                        scrollCollapse: true
                    };

                if (Reflect.has(this.datasource, 'columnDefs')) {
                    config.columnDefs = this.datasource.columnDefs;
                }

                // API object
                this.api = $table.DataTable(config)

                // layout table
                this.api.columns.adjust().draw()

                // if (this.referenceGenome) {
                //     this.api.rows( (index, data) => this.referenceGenome !== data[ 'reference genome' ] ).remove().draw();
                // }

                // jQuery object
                this.$dataTable = $table.dataTable()

            } catch (e) {
                console.error(e)
            } finally {
                this.stopSpinner()
            }
        }
    }

    getSelectedTableRowsData($rows) {
        const result = []

        if ($rows.length > 0) {

            $rows.removeClass('selected')

            const self = this;
            $rows.each(function () {
                const index = self.api.row(this).index()
                result.push(this.tableData[index])
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

export default FilteredModalTable
