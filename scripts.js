/**
 * The script is made to update the data in a way that allows for better analysis
 */

const e = require("express");
const fs = require("fs/promises");
try {
  (async () => {
    const allData = await getJSONDataFromFile();
    console.log(allData.length);
    let newData = [];
    let c = 0
    allData.forEach((order) => {
      const qualityObj = handleQualityData(order["quality"]);
      if (qualityObj.brand === '') {
        console.log(c);
        console.log(order['id']);
        console.log(order["quality"]);        
      }
      const placedDate = new Date(
        Number(order["placedTime"]["$date"]["$numberLong"])
      );
      let buyer = ''
      let price = 0.0
      let quantity = 0.0
      if (order["buyer"] !== undefined) {
        buyer= order["buyer"].trim();
      }
      if (order["price"] !== undefined) {
        price = Number(order["price"])
      }
      if (order["quantity"] !== undefined) {
        quantity = Number(order["quantity"])
      }
      
      newData.push({
        orderId: order["id"],
        millName: qualityObj.millName,
        type: qualityObj.brand,
        w: qualityObj.wi,
        h: qualityObj.he,
        weight: qualityObj.weight,
        gsm: qualityObj.gsm,
        sheets: qualityObj.sheets,
        placedTime: placedDate.toISOString(),
        placedDay: placedDate.getDate(),
        placedMonth: placedDate.getMonth(),
        placedYear: placedDate.getFullYear(),
        buyer: buyer,
        price: price,
        quantity: quantity
      });
      c++;
    });
    newData = JSON.stringify(newData)
    fs.writeFile("order-copy.json", newData, "utf8", function (err) {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
      }

      console.log("JSON file has been saved.");
    });
    console.log("after start");
  })();
} catch (e) {
  console.log("broken");
}

// go over each and every item
// make changes
// add it to a new array
// dump it all to a new file

/**
 * read all data from JSON file
 */
async function getJSONDataFromFile() {
  let rawdata = await fs.readFile("./order.json", "utf8");
  let allOrders = JSON.parse(rawdata);
  return allOrders;
}

/**
 * get all the quality data and parse it correctly
 */
function handleQualityData(quality) {
  //handle the KWLC situation separately
  if (quality.includes('REEL')) {
    return {
      millName: quality.split(' ')[0],
      brand: quality
    }
  }


  //split the quality
  // const regex =
  //   /[0-9].*\.?[0-9].*[Xx]{1}[0-9].*\.?[0-9].*-[0-9].*\.?[0-9].*K?G?/gm;

  const regex = /[A-Za-z0-9]+-[A-Za-z0-9]+/;
  const replaceRegex = /[K]{1}[G]{1}/gm;
  const replaceSheetsRegex = /[S]{1}/gm;
  const replaceGSMRegex = /[G]{1}/gm;
  const type = quality.split(" ");
  let count = 0;
  let returnData = {};
  let returnedNewData = {};
  try {
    for (const x of type) {
      let match = regex.test(x)
      if (match) {
        // found height and all
        let firstHalf, secondHalf = ''
        if (x.includes('x')) {
          firstHalf = x.split("x");
          secondHalf = firstHalf[1].split("-");
        } else if (x.includes('X')) {
          firstHalf = x.split("X");
          secondHalf = firstHalf[1].split("-");
        } else {
          returnedNewData = {
            brand: quality
          }
          break
        }
        const newData = {
          original: type,
          count: count,
          he: Number(firstHalf[0]),
          wi: Number(secondHalf[0]),
          weight: Number(secondHalf[1].replace(replaceRegex, "")),
        };
        returnedNewData = newData;
        break
      }
      count++;
    }
  } catch (e) {
    console.log(e);
    console.log("error");
  }
  returnData.he = returnedNewData.he;
  returnData.wi = returnedNewData.wi;
  returnData.weight = returnedNewData.weight;
  // iterate to add all brand thingies before count
  let brand = "";
  let millName = type[0];
  for (let i = 0; i < returnedNewData.count; i++) {
    brand += type[i]+' ';
  }
  returnData.brand = brand.trim();
  returnData.millName = millName;
  if (returnedNewData.count + 2 < type.length) {
    returnData.gsm = Number(type[returnedNewData.count + 1].replace(replaceGSMRegex, ""));
    returnData.sheets = Number(type[returnedNewData.count + 2].replace(replaceSheetsRegex, ""));
  }
  return returnData;
}
