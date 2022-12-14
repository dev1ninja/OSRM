const startLocation = L.latLng(29.701939, -95.273283)
var arrCSV;
var isUploaded = false;

var map = L.map('map').setView([29.701939, -95.273283], 5);
L.tileLayer('https://tile.mgoconnect.org/osm/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
L.Control.geocoder().addTo(map);

// Set up start location mark
L.marker([29.701939, -95.273283]).addTo(map).bindPopup("Start Location")

// Create Excel 
var wb = XLSX.utils.book_new();
wb.Props = {
    Title: "OSRM",
    Subject: "OSRM",
    Author: "OSRM",
    CreatedDate: new Date()
};

async function codeAddress(address) {
    let arr = [];
    for (let i = 0; i < address.length; i++) {
        arr.push(new Promise((resolve, reject) => {
            let encode = encodeURI(removeZipCode(address[i][0]))
            fetch(`https://geo.mygovernmentonline.org/search.php?q=${encode}&format=json&limit=1`)
            .then(response => response.text())
            .then(result => {
                let temp = JSON.parse(result)

                if(temp.length === 0){
                    resolve()
                } else {
                    arrCSV[i].push(temp[0].lat);
                    arrCSV[i].push(temp[0].lon);
                    resolve(L.latLng(temp[0].lat, temp[0].lon));
                }
            })
            .catch(error => console.log('error', error));
        }));
    }
    await Promise.all(arr).then(values => {
        console.log("updated arr object: ", arrCSV);
        let result = values.filter(function (row) {
            return row !== undefined
        })
        for (let i = 0; i < Math.ceil(result.length / 50); i++) {
            let arr = result.slice(i * 50, i * 50 + 50)
            setTimeout(() => {
                console.log(i);
                L.Routing.control({
                    waypoints: [startLocation, ...arr],
                    show: false,
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://osrm.mgoconnect.org/route/v1'
                    })
                }).on('routeselected', function (e) {
                    let route = e.route;
                    wb.SheetNames.push(`OSRM${i}`)
                    console.log("Route Result sub: ", route)
                    const ws_data = [
                        [
                            "Type",
                            "Distance",
                            "Time",
                            "Road",
                            "Direction",
                            "Index",
                            "Mode",
                            "Modifier",
                            "Text"
                        ],
                        ...route.instructions.map(item => [
                            item.type,
                            item.distance,
                            item.time,
                            item.road,
                            item.direction,
                            item.index,
                            item.mode,
                            item.modifier,
                            item.text
                        ])
                    ]
                    let ws = XLSX.utils.aoa_to_sheet(ws_data);
                    wb.Sheets[`OSRM${i}`] = ws;
                }).addTo(map);
            }, i*1000)

        }
    })
}

function removeZipCode(address) {
    let temp = address.slice(0, address.indexOf("-"));
    return temp.replace(/[^a-zA-Z0-9 ]/g, "")
}

function s2ab(s) {
    let buf = new ArrayBuffer(s.length);
    let view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}

function uploadCSV() {
    if ($("#fileToUpload").get(0).files.length === 0) {
        alert("Please upload the file first.");
        return;
    }
    let fileUpload = $("#fileToUpload").get(0);
    let files = fileUpload.files;
    if (files[0].name.toLowerCase().lastIndexOf(".csv") === -1) {
        alert("Please upload only CSV files");
        return;
    }
    let reader = new FileReader();
    let bytes = 500000;
    reader.onloadend = async function (evt) {
        let lines = evt.target.result;
        if (lines && lines.length > 0) {
            let line_array = CSVToArray(lines);
            console.log("CSV array: ", line_array);
            arrCSV = line_array
            if (lines.length === bytes) {
                line_array = line_array.splice(0, line_array.length - 1);
            }
            await codeAddress(line_array)
            document.querySelector('#btnExportRouteResult').disabled = false;
            document.querySelector('#btnExportCoordinates').disabled = false;
        }
    }
    let blob = files[0].slice(0, bytes);
    reader.readAsBinaryString(blob);
}

function exportRoute() {
    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'OSRM.xlsx');
}

function exportCoordinate() {
    let csvContent = arrCSV.map(e => e.join(",")).join("\r\n");
    let blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'})
    saveAs(blob, 'coordinates.csv')
}

function CSVToArray(strData, strDelimiter) {
    strDelimiter = (strDelimiter || ",");
    let objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
    );
    let arrData = [[]];
    let arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        let strMatchedDelimiter = arrMatches[1];
        let strMatchedValue = [];
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
            arrData.push([]);
        }
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
        } else {
            strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return (arrData);
}