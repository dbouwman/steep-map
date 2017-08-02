var turf = require('@turf/turf');
var fs = require('fs');
var lsq = require('least-squares');
var writeJsonFile = require('write-json-file');

var inputLine = fs.readFileSync('./data/dakota-5-0.geojson');
inputLine = JSON.parse(inputLine);

// now iterate all the points...
// let xValues = [10,9,8,7,6,5,4,3,2,1,0];
let xValues = [1,2,3,4,5,6,7,8,9,10];
let yValues = [];
let zValues = [];
let slopes = [];
let pointFeatures = [];

// get array of all z's
turf.coordEach(inputLine, function (currentCoords, currentIndex) {
  zValues.push(currentCoords[2]);
});
console.log('zValues.length: ' + zValues.length);
// now slice out the part of the z's we want...
turf.coordEach(inputLine, function (currentCoords, currentIndex) {
  // inject the Z into the array...
  if (currentIndex > 5) {
    yValues = zValues.slice(currentIndex - 5, currentIndex + 5);
    // console.log(JSON.stringify(yValues));
    // compute the slope
    let ret = {};
    lsq(xValues, yValues, ret);
    let slopeValue = Math.round(ret.m * 1000, 3) / 1000;
    let binned = binnify(slopeValue);
    slopes.push({slope: slopeValue, bin: binned});
    logPoint(currentCoords, ret.m);
    // add feature to the collection
    pointFeatures.push(
      {
        "type": "Feature",
        "properties": {
          "slope": slopeValue,
          "bin": binned
        },
        "geometry": {
          "type": "Point",
          "coordinates": [currentCoords[0], currentCoords[1]]
        }
      }
    );
  }
});

var collection = turf.featureCollection(pointFeatures);
// wire this to a geojson file
writeJsonFile('dakota-5-0-points.geojson', collection).then(() => {
    console.log('done');
});




function logPoint(coords, slope) {
  console.log('LAT: ' + coords[0] + ', LON: ' + coords[1] + ' Z: ' + coords[2] + ' SL: ' + slope);
}

function binnify (slopeValue) {
  let bins = cookBins();

  let bin = bins.reduce((acc, entry) => {
    if (slopeValue > entry.min && slopeValue < entry.max) {
      acc = entry.val
    }
    return acc;
  }, 0);

  return bin;
}

function cookBins () {
  let ranges = [];
  for (var i = -1; i < 1; i = i + 0.15) {
    ranges.push(i);
  }
  let bins = ranges.reduce((acc, r, idx, arry) => {
    acc.push({
      min: r,
      max: arry[idx + 1],
      val: idx + 1
    });
    return acc;
  }, []);
  return bins;
}
