var map = L.map('map').setView([37, -95], 5);
L.tileLayer('https://tile.mgoconnect.org/osm/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
L.Control.geocoder().addTo(map);
var routeControl = L.Routing.control({
    waypoints: [],
    serviceUrl: 'https://osrm.mgoconnect.org/route/v1',
    geocoder: L.Control.Geocoder.nominatim(),
    routeWhileDragging: true,
    show: true,
}).on('routeselected', function(e) {
    var route = e.route;
    console.log("route: ", route)
    alert('Showing route between waypoints:\n' + JSON.stringify(route.inputWaypoints, null, 2));
}).addTo(map);

var address;

// 2022.9.30 update

var geocoder = L.Control.Geocoder.nominatim();

function codeAddress() {
    let arr = [];
    for (let i = 0; i < address.length; i++) {
        arr.push(new Promise((resolve, reject) => {
            geocoder.geocode(address[i][0], function (results) {
                if (results[0] !== undefined) {
                    resolve(L.latLng(results[0].properties.lat, results[0].properties.lon));
                } else {
                    resolve()
                }
            })
        }));
    }
    Promise.all(arr).then(values => {
        let result = values.filter(function(row){
            return row !== undefined
        })
        routeControl.setWaypoints(result)
    })
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
    let bytes = 50000;
    reader.onloadend = function (evt) {
        let lines = evt.target.result;
        if (lines && lines.length > 0) {
            let line_array = CSVToArray(lines);
            if (lines.length === bytes) {
                line_array = line_array.splice(0, line_array.length - 1);
            }
            address = line_array;
            codeAddress()
        }
    }
    let blob = files[0].slice(0, bytes);
    reader.readAsBinaryString(blob);
}

function exportCSV() {
    
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
// 2022.9.30 update