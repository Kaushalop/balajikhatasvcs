//parse the stock sheet to be able to store the information in the database
'use strict';
const excelToJson = require('convert-excel-to-json');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const config =  require('./uploadConfig.js');
const uuidv4 = require('uuid/v4');

var request = require('request-promise');
var up = () => {
  console.log('reached up!');
}
var upload = (sourceFile, currentDayOrders) => {
  console.log(currentDayOrders)
  const url = config.mongoUrl;
  const dbName = config.mongoDb;

 /* var data = {
    longUrl: sourceFile,
    id: 'stocks_upload_'+Date.now()
  };
  const opts = {
  method: 'POST',
  uri: 'https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyAUu9zs2BXhUsR80qAJ1ryszQt32lsvk4A',
  body: data,
  json: true
}
  console.log(data);
  request(opts)
  .then(function (response) {

    // Handle the response
    console.log('Upload successful!  Server responded with:', response);
  })
  .catch(function (err) {
    // Deal with the error
    return console.error('upload failed:', err);
  })*/

  var map = new Object();
  for(var i=0;i< currentDayOrders.length; i++) {
    let ele = currentDayOrders[i];
    map[ele.quality] = ele;
  }
  

  const options = {
  	sourceFile: sourceFile,
  	header: config.header,
    columnToKey: config.columnToKey
  };
  const result = excelToJson(options);
  //store the information in a database
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, client) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    var firstProp;
    for(var key in result) {
      if(result.hasOwnProperty(key)) {
          firstProp = result[key];
          break;
      }
  }

  //remove elements which do not have packets defined
for (var i = 0;i < firstProp.length; i++) {
  var ele = firstProp[i];
  firstProp[i].id = uuidv4();
  firstProp[i].date = new Date();
  if(ele.quantity == null || ele.quantity == '') {
    firstProp.splice(i, 1);
  }
  if(ele.packets == null || ele.packets == '') {
    firstProp[i].packets = ele.quantity;
    firstProp[i].quantity = null;
  }
  let order = map[ele.quality];
  if(order) {
    if(order.packets == null || order.quantity == '') {
      firstProp[i].packets -= order.quantity;
    }
  }
}

//eliminate the last element as it will always be the grand total
firstProp.splice(firstProp.length-1, 1);

    insertDocuments(db, firstProp, function() {
        client.close();
      });
  });
}
const insertDocuments = function(db, docs, callback) {
  // Get the documents collection
  const collection = db.collection('stock');
  // Insert some documents
  collection.insertMany(docs, function(err, result) {
    assert.equal(err, null);
    console.log(result.result.n);
    console.log(result.ops.length);
    console.log("Inserted documents into the collection");
    callback(result);
  });
}

module.exports.up = up;
module.exports.upload = upload;
