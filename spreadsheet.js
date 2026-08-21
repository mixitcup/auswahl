// Spreadsheet Grid Module
class SpreadsheetGrid {
    constructor(gridId = 'dataGrid') {
        this.gridId = gridId;
        this.grid = document.getElementById(gridId);
        this.defaultData = [];
    }

    // Initialize grid with default data
    init(defaultData = []) {
        this.defaultData = defaultData;
        this.render();
    }

    render() {
        this.grid.innerHTML = '';
        
        if (this.defaultData.length === 0) {
            this.addRow();
        } else {
            this.defaultData.forEach(rowData => {
                this.addRow(rowData);
            });
            this.addRow();
        }
    }

    addRow(data = ['', '']) {
        const row = document.createElement('div');
        row.className = 'data-row';
        
        row.innerHTML = `
            <input type="text" class="uni-input" value="${data[0]}" placeholder="University">
            <input type="text" class="person-input" value="${data[1]}" placeholder="Person">
        `;
        
        // Add event listeners to detect when user finishes editing
        const uniInput = row.querySelector('.uni-input');
        const personInput = row.querySelector('.person-input');
        
        uniInput.addEventListener('blur', () => this.checkAndAddRow());
        personInput.addEventListener('blur', () => this.checkAndAddRow());
        
        // Listen for paste events to detect multi-line pastes
        uniInput.addEventListener('paste', (e) => this.handlePaste(e, uniInput, personInput));
        personInput.addEventListener('paste', (e) => this.handlePaste(e, uniInput, personInput));
        
        this.grid.appendChild(row);
    }

    async handlePaste(event, uniInput, personInput) {
        // Check if clipboard contains multiple lines
        try {
            const text = await navigator.clipboard.readText();
            const lines = text.trim().split('\n');
            console.log(lines);
            
            // If clipboard has multiple lines (more than 1 line) and current row is empty
            if (lines.length > 1) {
                // Prevent the default paste behavior
                event.preventDefault();
                // Use the spreadsheet paste logic
                this.pasteFromSpreadsheet(text);
            }
        } catch (err) {
            // Clipboard access denied or failed, let default paste happen
            console.debug('Could not access clipboard for auto-paste detection');
        }
    }

    checkAndAddRow() {
        // Remove empty rows first
        this.removeEmptyRows();
        
        // Check if last row has data
        const rows = this.grid.querySelectorAll('.data-row');
        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const uniInput = lastRow.querySelector('.uni-input');
            const personInput = lastRow.querySelector('.person-input');
            
            // If last row has data, add a new empty row
            if (uniInput.value.trim() !== '' || personInput.value.trim() !== '') {
                this.addRow();
            }
        }
    }

    removeEmptyRows() {
        const rows = this.grid.querySelectorAll('.data-row');
        rows.forEach(row => {
            const rows_local = this.grid.querySelectorAll('.data-row');
            // Don't remove the only row if there is only one
            if (rows_local.length <= 1) {
                return;
            }

            const uniInput = row.querySelector('.uni-input');
            const personInput = row.querySelector('.person-input');
            
            // Remove row if both fields are empty
            if (uniInput.value.trim() === '' && personInput.value.trim() === '') {
                row.remove();
            }
        });
    }

    clear() {
        this.grid.innerHTML = '';
        this.addRow();
    }

    getData() {
        const rows = this.grid.querySelectorAll('.data-row');
        const unis = [];
        const personen = [];
        
        rows.forEach(row => {
            const uniInput = row.querySelector('.uni-input');
            const personInput = row.querySelector('.person-input');
            
            const uni = uniInput.value.trim();
            const person = personInput.value.trim();
            
            if (uni || person) {
                unis.push(uni);
                personen.push(person);
            }
        });
        
        return { unis, personen };
    }

    pasteFromSpreadsheet(text) {
        const lines = text.trim().split('\n');
        this.grid.innerHTML = '';
        
        lines.forEach(line => {
            const cells = line.split('\t');
            const uni = cells[0] ? cells[0].trim() : '';
            const person = cells[1] ? cells[1].trim() : '';
            this.addRow([uni, person]);
        });
        
        // Remove any empty rows that might have been created
        this.removeEmptyRows();
        
        // Add a new empty row at the end
        this.addRow();
    }

    exportToSpreadsheet() {
        const { unis, personen } = this.getData();
        
        let csvContent = 'University\tPerson\n';
        for (let i = 0; i < Math.max(unis.length, personen.length); i++) {
            csvContent += `${unis[i] || ''}\t${personen[i] || ''}\n`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'mixitcup_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return unis.length;
    }
}
