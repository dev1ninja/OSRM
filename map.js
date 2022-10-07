var startLocation = L.latLng(29.701939, -95.273283)

var map = L.map('map').setView([29.701939, -95.273283], 5);
L.tileLayer('https://tile.mgoconnect.org/osm/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
L.Control.geocoder().addTo(map);

var routeResult, hasResult = false;

var routeControl = L.Routing.control({
    waypoints: startLocation,
    serviceUrl: 'https://osrm.mgoconnect.org/route/v1',
    geocoder: L.Control.Geocoder.nominatim(),
    routeWhileDragging: true,
    show: false,
}).addTo(map);

// Create Excel 
var wb = XLSX.utils.book_new();
wb.Props = {
    Title: "OSRM",
    Subject: "OSRM",
    Author: "OSRM",
    CreatedDate: new Date()
};

var address;

// 2022.9.30 update

var geocoder = L.Control.Geocoder.nominatim();

var myHeaders = new Headers();
myHeaders.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9");
myHeaders.append("Accept-Language", "en-US,en;q=0.9");
myHeaders.append("Cache-Control", "max-age=0");
myHeaders.append("Connection", "keep-alive");
myHeaders.append("Sec-Fetch-Dest", "document");
myHeaders.append("Sec-Fetch-Mode", "navigate");
myHeaders.append("Sec-Fetch-Site", "none");
myHeaders.append("Sec-Fetch-User", "?1");
myHeaders.append("Upgrade-Insecure-Requests", "1");
myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36");
myHeaders.append("sec-ch-ua", "\"Chromium\";v=\"106\", \"Google Chrome\";v=\"106\", \"Not;A=Brand\";v=\"99\"");
myHeaders.append("sec-ch-ua-mobile", "?0");

var requestOptions = {
  method: 'GET',
  headers: myHeaders,
  redirect: 'follow'
};

function codeAddress() {
    let arr = [];
    for (let i = 0; i < address.length; i++) {
        arr.push(new Promise((resolve, reject) => {
            // geocoder.geocode(address[i][0], function (results) {
            //     if (results[0] !== undefined) {
            //         resolve(L.latLng(results[0].properties.lat, results[0].properties.lon));
            //     } else {
            //         resolve()
            //     }
            // })
            let encode = encodeURI(removeZipCode(address[i][0]))
            fetch(`https://geo.mygovernmentonline.org/search.php?q=${encode}&format=json&limit=1`, requestOptions)
            .then(response => response.text())
            .then(result => {
                let temp = JSON.parse(result)
                if(temp.length === 0){
                    resolve()
                } else {
                    // console.log(temp.length, typeof(temp), "temp: 12", temp)
                    resolve(L.latLng(temp[0].lat, temp[0].lon));
                }
            })
            .catch(error => console.log('error', error));
        }));
    }
    Promise.all(arr).then(values => {
        let result = values.filter(function (row) {
            return row !== undefined
        })
        console.log("------------>", values)
        for (let i = 0; i < Math.ceil(result.length / 50); i++) {
            let arr = result.slice(i * 50, i * 50 + 50)
            setTimeout(() => {
                console.log(i);
                L.Routing.control({
                    waypoints: [startLocation, ...arr],
                    serviceUrl: 'https://osrm.mgoconnect.org/route/v1',
                    geocoder: L.Control.Geocoder.nominatim(),
                    show: false,
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
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
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

function exportRoute() {
    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'OSRM.xlsx');
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