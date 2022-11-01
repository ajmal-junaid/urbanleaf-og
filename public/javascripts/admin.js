$(document).ready(function () {
    $('#tbl_exporttable_to_xls').DataTable();
});

function ExportToExcel(type, fn, dl) {
    var elt = document.getElementById('tbl_exporttable_to_xls');
    var wb = XLSX.utils.table_to_book(elt, { sheet: "sheet1" });
    return dl ?
        XLSX.write(wb, { bookType: type, bookSST: true, type: 'base64' }) :
        XLSX.writeFile(wb, fn || ('MySheetName.' + (type || 'xlsx')));
}

function ExportToPdf(data) {
    $("#tbl_exporttable_to_xls").tableHTMLExport({

        type: 'pdf',
        orientation: 'p',
        filename: 'sample.pdf'

    });
}   