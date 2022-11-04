
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


function demoFromHTML() {
    var pdf = new jsPDF('landscape', 'pt');
    source = $('#customerff')[0];
    specialElementHandlers = {
        '#bypassme': function (element, renderer) {
            return true
        }
    };
    margins = {
        top: 80,
        bottom: 60,
        left: 100,
        width: 822,
        height: 100
    };
    pdf.fromHTML(
        source, // HTML string or DOM elem ref.
        margins.left, // x coord
        margins.top, { // y coord
        'width': margins.width, // max width of content on PDF
        'elementHandlers': specialElementHandlers
    },

        function (dispose) {
            pdf.save('Report.pdf');
        }, margins
    );
}
// index number for td with class ajindex

var divs = document.querySelectorAll('.ajindex'); for (var i = 0; i <
    divs.length; ++i) { divs[i].innerHTML = i + 1; }