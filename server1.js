import express from "express"; // call express
import errorHandler from "api-error-handler";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import { upload } from "./upload.js";
import { Client as RestClient } from "node-rest-client";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

const app = express();
const client = new RestClient();
const Schema = mongoose.Schema;

var StockSchema = new Schema({
  id: String,
  quality: String,
  quantity: Schema.Types.Mixed,
  packets: Number,
});

var MillOrderSchema = new Schema(
  {
    id: String,
    orderNumber: { type: String, unique: true },
    placedBy: String,
    placedTime: Date,
    mill: String,
    billing: String,
    quality: String,
    length: String,
    width: String,
    gsm: String,
    buyer: String,
    shippingaddress: String,
    quantity: Schema.Types.Mixed,
    notes: String,
    status: String,
  },
  {
    timestamps: true,
  }
);

var OrderSchema = new Schema(
  {
    id: String,
    quality: String,
    quantity: Schema.Types.Mixed,
    placedBy: String,
    placedTime: Date,
    buyer: String,
    consignee: String,
    price: Schema.Types.Mixed,
    consigneeAddress: String,
    buyerNumber: String,
    shipped: String,
  },
  {
    timestamps: true,
  }
);
var ClientSchema = new Schema(
  {
    id: String,
    name: String,
    number: String,
    address: String,
    accountOwner: String
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ name: "text", id: "text", accountOwner: "text" }, { unique: false });
var Client = mongoose.model("Client", ClientSchema, "client");
var Stock = mongoose.model("Stock", StockSchema, "stock");
var Order = mongoose.model("Order", OrderSchema, "order");
var MillOrder = mongoose.model("MillOrder", MillOrderSchema, "millorder");

process.on("uncaughtException", function (err) {
  console.log(err);
});

mongoose.connect(
  "mongodb://balaji:balaji1234@cluster0-shard-00-00.gqyfs.mongodb.net:27017,cluster0-shard-00-01.gqyfs.mongodb.net:27017,cluster0-shard-00-02.gqyfs.mongodb.net:27017/stock?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority"
);

//check db conn
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  // we're connected!
  console.log("Connected!");
});

StockSchema.index({ name: "text", id: "text" });
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use("/public", express.static(__dirname + "/public"));

var port = process.env.PORT || 8080;
var router = express.Router();
// middleware to use for all requests
router.use(function (req, res, next) {
  // do logging
  next(); // make sure we go to the next routes and don't stop here
});

const GET_ORDERS_URL = "/orders";
const GET_ORDERS_PRICE = "/orders/lastprice";
const POST_ORDER_SHIPPED_URL = "/orders/:id/shipped";
const DELETE_ORDER_ID = "/orders/:id";
const PUT_STOCKS_UPDATE = "/stocks/update";
const GET_POST_DELETE_STOCKS = "/stocks";
const GET_STOCK = "/stock";
const GET_STOCKS_SEARCH = "/stocks/search";
const POST_STOCKS_ORDER = "/stocks/order";
const POST_STOCKS_UPLOAD = "/stocks/upload";
const GET_POST_CLIENTS = "/clients";
const GET_CLIENTS_ID = "/clients/:id";
const UPDATE_CLIENTS_ID = "/clients/:id";
const GET_CLIENTS_SEARCH = "/clients/search";

router.route(GET_ORDERS_URL).get(async (req, res) => {
  try {
    console.log(req.query);
    console.log(new Date(Number(req.query.start)).toJSON());

    const start = req.query.start;
    const end = req.query.end;

    console.log(start);
    console.log(end);
    
    const orders = await Order.find({ placedTime: { $gte: start, $lt: end } });
    res.json(orders);
  } catch (err) {
    console.log("Error");
    res.status(500).send(err);
  }
});

router.route(GET_ORDERS_PRICE).get(async (req, res) => {
  try {
    const doc = await Order.findOne({ 
      quality: { $in: [req.query.quality] }, 
      buyer: { $in: [req.query.buyer] } 
    }).sort({ placedTime: -1 });
    
    res.json(doc || {});
  } catch (err) {
    console.log("Error");
    res.status(500).send(err);
  }
});

router.route(POST_ORDER_SHIPPED_URL).post(async (req, res) => {
  try {
    const orders = await Order.find({ id: req.params.id });
    if (orders.length > 0) {
      const order = orders[0];
      order.shipped = "YES";
      
      await Order.updateOne({ id: order.id }, order);
      
      // Shipping message
      if (order.buyerNumber) {
        const number = order.buyerNumber;
        const message = `${order.quantity} packets ${order.quality}. Billing: ${order.buyer}, Shipped: ${order.consignee}.%nThe above order has been shipped by Balaji Pratishthan.`;
        
        const args = {
          headers: { "Content-Type": "application/json" },
        };
        
        const url = `https://api.textlocal.in/send/?apikey=MzgzNDQ0NzMzMjMxNjE0NDRlNTY0NzZkNDY0YTVhNTc=&numbers=${number}&message=${encodeURIComponent(message)}&sender=BPPLWB`;
        
        await new Promise((resolve) => {
          client.post(url, args, function (data, response) {
            console.log(data);
            resolve(data);
          });
        });
      }
      
      res.json({ message: "Order Updated!" });
    } else {
      res.json({ message: "Order Not Found!" });
    }
  } catch (err) {
    console.log("Order not able to update.");
    res.status(500).send({
      message: "Error while updating order, please try again.",
      err: err,
    });
  }
});

router.route(DELETE_ORDER_ID).delete(async (req, res) => {
  try {
    const orders = await Order.find({ id: req.params.id });
    if (orders.length > 0) {
      const order = orders[0];
      await Order.deleteOne({ id: req.params.id });
      
      if (order.buyerNumber) {
        const number = order.buyerNumber;
        const message = `${order.quantity} packets ${order.quality}. Billing: ${order.buyer}, Shipped: ${order.consignee}.%nThe above order has been cancelled by Balaji Pratishthan, please inform the concerned person in case of discrepancy.`;
        
        const args = {
          headers: { "Content-Type": "application/json" },
        };
        
        const url = `https://api.textlocal.in/send/?apikey=MzgzNDQ0NzMzMjMxNjE0NDRlNTY0NzZkNDY0YTVhNTc=&numbers=${number}&message=${encodeURIComponent(message)}&sender=BPPLWB`;
        
        await new Promise((resolve) => {
          client.post(url, args, function (data, response) {
            console.log(data);
            resolve(data);
          });
        });
      }
      
      res.json({ message: "Cleared" });
    } else {
      res.json({ message: "Order Not Found!" });
    }
  } catch (err) {
    console.log("Error");
    res.status(500).send({
      message: "Error while clearing, please try again.",
      err: err,
    });
  }
});

router.route(PUT_STOCKS_UPDATE).put(function (req, res) {
  //update the Stock with the new quantity
  let curStock = {};
  console.log(req.body);
  Stock.findOne(
    { quality: { $in: [req.body.quality] } },
    function (err, stock) {
      if (err) {
        console.log("Stock not found to update.");
        res.status(500).send({
          message: "Error while finding stock, please try again.",
          err: err,
        });
      }
      //update the stock
      curStock = stock;
      console.log(curStock.packets);
      console.log(req.body.packets);
      let updatedPackets =
        parseInt(req.body.packets) + parseInt(curStock.packets);
      curStock.packets = updatedPackets;
      console.log("||||" + curStock.packets);
      Stock.update({ id: curStock.id }, curStock, function (err, stock) {
        if (err) {
          console.log("Stock not able to update.");
          res.status(500).send({
            message: "Error while updating stock, please try again.",
            err: err,
          });
        }
        console.log(stock);
        res.json({
          message: "Stock Updated!",
        });
      });
    }
  );
});

router
  .route(GET_POST_DELETE_STOCKS)
  .post(function (req, res) {
    var stock = new Stock(); // create a new instance of the Bear model
    stock.id = req.body.id; // set the bears name (comes from the request)
    stock.ProductName = req.body.ProductName;
    stock.alt = req.body.alt;

    // save the bear and check for errors
    stock.save(function (err) {
      if (err) res.send(err);

      res.json({ message: "Stock created!" });
    });
  })
  .get(function (req, res) {
    Stock.find(function (err, bears) {
      if (err) {
        console.log("Error");
        res.send(err);
      }

      res.json(bears);
    });
  })
  .delete(function (req, res) {
    Stock.remove(function (err, bears) {
      if (err) {
        console.log("Error");
        res.status(500).send({
          message: "Error while clearing, please try again.",
          err: err,
        });
      }
      res.json({
        message: "Cleared",
      });
    });
  });

router.route(GET_STOCK).get(function (req, res) {
  findStockById(req.query.id, req.query.q, res);
});

router.route(GET_STOCKS_SEARCH).get(function (req, res) {
  let searchString = req.query.q;
  Stock.find({ $text: { $search: '"' + searchString + '"' } }).exec(function (
    err,
    docs
  ) {
    if (err) {
      console.log("Error");
      res.send(err);
    }
    res.json(docs);
  });
});

router.route(POST_STOCKS_ORDER).post(function (req, res) {
  console.log(req.body);
  console.log(req.body.quantity);
  //if the stock does not have 'packets' then the quantity that will be checked is the 'quantity'
  Stock.find({
    id: req.body.id,
    packets: { $gte: parseInt(req.body.quantity) },
  }).exec(function (err, docs) {
    if (err) {
      console.log("Error");
      res.send(err);
    }
    if (docs != undefined) {
      console.log(docs.length);

      var message = {};
      if (docs.length > 0) {
        //store the order that is placed
        var order = new Order();
        order.id = uuidv4();
        order.quality = req.body.quality; // set the bears name (comes from the request)
        order.quantity = req.body.quantity;
        order.placedBy = req.body.placedBy;
        order.placedTime = new Date();
        order.buyer = req.body.buyer;
        order.consignee = req.body.consignee;
        order.price = req.body.price;
        order.consigneeAddress = req.body.address;
        order.buyerNumber = req.body.buyerNumber;

        console.log(order);
        // save the bear and check for errors
        order.save(function (err) {
          if (err) {
            const errorMessage = {
              err: err,
              message: "Errror!",
              status: false,
            };
            message = errorMessage;
          }
          console.log("order created!");
          let smsMessage = "Message not sent.";
          if (req.body.buyerNumber) {
            let number = req.body.buyerNumber;
            let message =
              order.quantity +
              " packets " +
              order.quality +
              ". Billing: " +
              order.buyer +
              ", Shipped: " +
              order.consignee +
              ".%nAny discrepancy in the above order, please inform the concerned person at Balaji Pratishthan.";
            var args = {
              headers: { "Content-Type": "application/json" },
            };
            let url =
              "https://api.textlocal.in/send/?apikey=MzgzNDQ0NzMzMjMxNjE0NDRlNTY0NzZkNDY0YTVhNTc=&numbers=" +
              number +
              "&message=" +
              encodeURIComponent(message) +
              "&sender=BPPLWB";
            client.post(url, args, function (data, response) {
              // parsed response body as js object
              console.log(data);
              return data;
            });
            smsMessage = "Message Sent.";
          } else {
            smsMessage = "Message not sent because no number.";
          }
          console.log("====");
          console.log(smsMessage);
          const successMessage = {
            message: "Order Created. " + smsMessage,
            status: true,
          };
          message = successMessage;
        });
        //reduce the quantity in the stocks

        var stock = docs[0];
        //if the stock does not have 'packets' then the quantity that will be checked is the 'quantity'
        if (stock.packets) {
          stock.packets -= req.body.quantity;
        } else {
          stock.quantity -= req.body.quantity;
        }

        stock.save(function (err) {
          if (err) {
            const errorMessage = {
              err: err,
              message: "Errror!",
              status: false,
            };
            console.log(errorMessage);
          }
          console.log("Stock Updated");
          console.log(message);
          res.json(message);
        });
      } else {
        const errorMessage = {
          message: "Item Not Found!",
          status: false,
        };
        res.json(errorMessage);
      }
    }
  });
});

router.route(POST_STOCKS_UPLOAD).post(function (req, res) {
  //provide the upload functionality

  let imageFile = req.files.file;

  imageFile.mv(`${__dirname}/public/${req.body.filename}.xlsx`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }
    var start = new Date();
    start.setHours(0, 0, 0, 0);

    var end = new Date();
    end.setHours(23, 59, 59, 999);

    let currentDayOrders = [];
    Order.find(
      { placedTime: { $gte: start, $lt: end } },
      function (err, bears) {
        if (err) {
          console.log("Error");
          res.send(err);
        }
        currentDayOrders = bears;
        upload.upload(`public/${req.body.filename}.xlsx`, currentDayOrders);
        res.json({ file: `public/${req.body.filename}.xlsx` });
      }
    );
  });
});

router
  .route(GET_POST_CLIENTS)
  .post(function (req, res) {
    var client = new Client();
    client.id = uuidv4();
    client.name = req.body.name;
    client.number = req.body.number;
    client.address = req.body.address;
    client.accountOwner = req.body.accountOwner;
    client.save(function (err) {
      if (err) res.send(err);

      res.json({ message: "Client added!" });
    });
  })
  .get(function (req, res) {
    Client.find().then(function (err, bears) {
      if (err) {
        console.log("Error");
        res.send(err);
      }
      res.json(bears);
    });
  });

router.route(GET_CLIENTS_ID).get(function (req, res) {
  Client.find({ id: { $in: [req.params.id] } }).exec(function (err, docs) {
    if (err) {
      console.log("Not Found!");
      res.send(err);
    }
    res.json(docs);
  });
});

router.route(GET_CLIENTS_SEARCH).get(function (req, res) {
  console.log(req.query.q);
  Client.find({
    $or: [
      { name: { $regex: ".*" + req.query.q + ".*", $options: "i" } },
      { accountOwner: { $regex: ".*" + req.query.q + ".*", $options: "i" } }
    ]
  }).exec(function (err, docs) {
    if (err) {
      console.log("Not Found!");
      res.send(err);
    }
    res.json(docs);
  });
});

router.route(UPDATE_CLIENTS_ID).put(function (req, res) {
  Client.put({ id: req.params.id }, req.body, function (err, docs) {
    res.json(docs);
  });
});

router.get("/", function (req, res) {
  res.json({ message: "hooray! welcome to our api!" });
});

//for prefixing our api
app.use(errorHandler());
app.use("/api", router);

const findStockById = (id, quantity, res) => {
  console.log(id + "" + quantity);
  Stock.find({ id: { $in: [id] }, packets: { $gte: parseInt(quantity) } }).exec(
    function (err, docs) {
      if (err) {
        console.log("Error");
        res.send(err);
      }
      console.log(docs);
      res.json(docs);
    }
  );
};

const findPriceByQualityAndBuyer = (quality, buyer, res) => {
  console.log(quality + " " + buyer);
  Order.findOne({ quality: { $in: [quality] }, buyer: { $in: [buyer] } })
    .sort({ placedTime: -1 })
    .exec(function (err, docs) {
      if (err) {
        console.log("Error");
        res.send(err);
      }
      console.log(docs);
      if (docs === null) {
        docs = {};
      }
      res.json(docs);
    });
};

app.listen(port);
console.log("Kicked off at " + port);
