var express = require('express');        // call express
var app = express();
var errorHandler = require('api-error-handler');
var bodyParser = require('body-parser');
var cors = require('cors');

const fileUpload = require('express-fileupload');
var upload = require('./upload.js');
var Client = require('node-rest-client').Client;

var client = new Client();

const uuidv4 = require('uuid/v4');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StockSchema = new Schema({
    id: String,
    quality: String,
    quantity: Schema.Types.Mixed,
    packets: Number
});

var MillOrderSchema = new Schema({
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
    status: String
});

var OrderSchema = new Schema({
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
    shipped: String
});
var ClientSchema = new Schema({
    id: String,
    name: String,
    number: String,
    address: String
});

ClientSchema.index({ '$**': 'text' });
var Client = mongoose.model('Client', ClientSchema, 'client');
var Stock = mongoose.model('Stock', StockSchema, 'stock');
var Order = mongoose.model('Order', OrderSchema, 'order');
var MillOrder = mongoose.model('MillOrder', MillOrderSchema, 'millorder');

process.on('uncaughtException', function (err) {
    console.log(err);
})

mongoose.connect('mongodb://balaji:balaji1234@cluster0-shard-00-00.gqyfs.mongodb.net:27017,cluster0-shard-00-01.gqyfs.mongodb.net:27017,cluster0-shard-00-02.gqyfs.mongodb.net:27017/stock?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority');

//check db conn
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    // we're connected!
    console.log('conn');
});

StockSchema.index({ '$**': 'text' });
ClientSchema.index({ '$**': 'text' });
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/public', express.static(__dirname + '/public'));

var port = process.env.PORT || 8080;
var router = express.Router();
// middleware to use for all requests
router.use(function (req, res, next) {
    // do logging
    next(); // make sure we go to the next routes and don't stop here
});

const GET_ORDERS_URL = '/orders'
const GET_ORDERS_PRICE = '/orders/lastprice'
const POST_ORDER_SHIPPED_URL = '/orders/:id/shipped'
const DELETE_ORDER_ID = '/orders/:id'
const PUT_STOCKS_UPDATE = '/stocks/update'
const GET_POST_DELETE_STOCKS = '/stocks'
const GET_STOCK = '/stock'
const GET_STOCKS_SEARCH = '/stocks/search'
const POST_STOCKS_ORDER = '/stocks/order'
const POST_STOCKS_UPLOAD = '/stocks/upload'
const GET_POST_CLIENTS = '/clients'
const GET_CLIENTS_ID = '/clients/:id'
const GET_CLIENTS_SEARCH = '/clients/search'


router.route(GET_ORDERS_URL)
    .get(function (req, res) {
        console.log(req.query)
        console.log(new Date(Number(req.query.start)).toJSON())
        
        var start = new Date(Number(req.query.start))
        var end = new Date(Number(req.query.end))

        console.log(start)
        console.log(end)
        Order.find({placedTime: { $gte: start, $lt: end }}, function (err, bears) {
            if (err) {
                console.log('Error');
                res.send(err);
            }

            res.json(bears);
        });
    })
    router.route(GET_ORDERS_PRICE)
    .get(function (req, res) {
        findPriceByQualityAndBuyer(req.query.quality, req.query.buyer, res);
    });

router.route(POST_ORDER_SHIPPED_URL)
    .post(function (req, res) {
        //update the Order with shipped
        let order = {};
        Order.find({ 'id': req.params.id }, function (err, bears) {
            if (err) {
                console.log('Error');
                res.send(err);
            }
            if (bears.length > 0) {
                order = bears[0];
                order.shipped="YES";
                Order.update({ 'id': order.id }, order, function (err, stock) {
                    if (err) {
                        console.log('Order not able to update.');
                        res.status(500).send({
                            message: 'Error while updating order, please try again.',
                            err: err
                        });
                    }
                    console.log(stock);
                    // Shipping message
                    if (order.buyerNumber) {
                        let number = order.buyerNumber;
                        let message = order.quantity + ' packets ' + order.quality + '. Billing: ' + order.buyer + ', Shipped: ' + order.consignee + '.%nThe above order has been shipped by Balaji Enterprises.';
                        var args = {
                            headers: { "Content-Type": "application/json" }
                        };
                        let url = 'https://api.textlocal.in/send/?apikey=Fz0TjetvGAE-2xxY1tPXDpn5A3b5Hqh2t3356ZhPNi&numbers=' + number + '&message=' + encodeURIComponent(message) + '&sender=BLENTP';
                        client.post(url, args, function (data, response) {
                            // parsed response body as js object
                            console.log(data);
                            return data;
                        });
                    }
                    res.json({
                        message: 'Order Updated!'
                    });
                })
            } else {
                res.json({
                    message: 'Order Not Found!'
                })
            }

        });
    })
router.route(DELETE_ORDER_ID)
    .delete(function (req, res) {
        //get the order details first, so that you can send the message
        let order = {};
        Order.find({ 'id': req.params.id }, function (err, bears) {
            if (err) {
                console.log('Error');
                res.send(err);
            }
            if (bears.length > 0) {
                order = bears[0];
                Order.remove({ 'id': req.params.id }, function (err, bears) {
                    if (err) {
                        console.log('Error');
                        res.status(500).send({
                            message: 'Error while clearing, please try again.',
                            err: err
                        });
                    }
                    if (order.buyerNumber) {
                        let number = order.buyerNumber;
                        let message = order.quantity + ' packets ' + order.quality + '. Billing: ' + order.buyer + ', Shipped: ' + order.consignee + '.%nThe above order has been cancelled by Balaji Enterprises, please inform the concerned person in case of discrepancy.';
                        var args = {
                            headers: { "Content-Type": "application/json" }
                        };
                        let url = 'https://api.textlocal.in/send/?apikey=Fz0TjetvGAE-2xxY1tPXDpn5A3b5Hqh2t3356ZhPNi&numbers=' + number + '&message=' + encodeURIComponent(message) + '&sender=BLENTP';
                        client.post(url, args, function (data, response) {
                            // parsed response body as js object
                            console.log(data);
                            return data;
                        });
                    }
                    res.json({
                        message: 'Cleared'
                    });
                });
            } else {
                res.json({
                    message: 'Order Not Found!'
                })
            }

        });

    });
router.route(PUT_STOCKS_UPDATE)
    .put(function (req, res) {
        //update the Stock with the new quantity
        let curStock = {};
        console.log(req.body);
        Stock.findOne({ 'quality': { $in: [req.body.quality] } }, function (err, stock) {
            if (err) {
                console.log('Stock not found to update.');
                res.status(500).send({
                    message: 'Error while finding stock, please try again.',
                    err: err
                });
            }
            //update the stock
            curStock = stock;
            console.log(curStock.packets);
            console.log(req.body.packets);
            let updatedPackets = parseInt(req.body.packets) + parseInt(curStock.packets);
            curStock.packets = updatedPackets;
            console.log('||||' + curStock.packets);
            Stock.update({ 'id': curStock.id }, curStock, function (err, stock) {
                if (err) {
                    console.log('Stock not able to update.');
                    res.status(500).send({
                        message: 'Error while updating stock, please try again.',
                        err: err
                    });
                }
                console.log(stock);
                res.json({
                    message: 'Stock Updated!'
                });
            })
        })
    })

router.route(GET_POST_DELETE_STOCKS)
    .post(function (req, res) {

        var stock = new Stock();      // create a new instance of the Bear model
        stock.id = req.body.id;  // set the bears name (comes from the request)
        stock.ProductName = req.body.ProductName;
        stock.alt = req.body.alt;

        // save the bear and check for errors
        stock.save(function (err) {
            if (err)
                res.send(err);

            res.json({ message: 'Stock created!' });
        });

    })
    .get(function (req, res) {
        Stock.find(function (err, bears) {
            if (err) {
                console.log('Error');
                res.send(err);
            }

            res.json(bears);
        });
    })
    .delete(function (req, res) {
        Stock.remove(function (err, bears) {
            if (err) {
                console.log('Error');
                res.status(500).send({
                    message: 'Error while clearing, please try again.',
                    err: err
                });
            }
            res.json({
                message: 'Cleared'
            });
        });
    });

router.route(GET_STOCK)
    .get(function (req, res) {
        findStockById(req.query.id, req.query.q, res);
    });

router.route(GET_STOCKS_SEARCH)
    .get(function (req, res) {
        let searchString = req.query.q;
        Stock.find({ $text: { $search: '\"' + searchString + '\"' } })
            .exec(function (err, docs) {
                if (err) {
                    console.log('Error');
                    res.send(err);
                }
                res.json(docs);
            });
    });
router.route(POST_STOCKS_ORDER)
    .post(function (req, res) {
        console.log(req.body);
        console.log(req.body.quantity);
        //if the stock does not have 'packets' then the quantity that will be checked is the 'quantity'
        Stock.find({ 'id': req.body.id, 'packets': { $gte: parseInt(req.body.quantity) } })
            .exec(function (err, docs) {
                if (err) {
                    console.log('Error');
                    res.send(err);
                }
                if (docs != undefined) {
                    console.log(docs.length);

                    var message = {};
                    if (docs.length > 0) {
                        //store the order that is placed
                        var order = new Order();
                        order.id = uuidv4();
                        order.quality = req.body.quality;  // set the bears name (comes from the request)
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
                                    message: 'Errror!',
                                    status: false
                                };
                                message = errorMessage;
                            }
                            console.log('order created!')
                            let smsMessage = 'Message not sent.';
                            if (req.body.buyerNumber) {
                                let number = req.body.buyerNumber;
                                let message = order.quantity + ' packets ' + order.quality + '. Billing: ' + order.buyer + ', Shipped: ' + order.consignee + '.%nAny discrepancy in the above order, please inform the concerned person at Balaji Enterprises.';
                                var args = {
                                    headers: { "Content-Type": "application/json" }
                                };
                                let url = 'https://api.textlocal.in/send/?apikey=Fz0TjetvGAE-2xxY1tPXDpn5A3b5Hqh2t3356ZhPNi&numbers=' + number + '&message=' + encodeURIComponent(message) + '&sender=BLENTP';
                                client.post(url, args, function (data, response) {
                                    // parsed response body as js object
                                    console.log(data);
                                    return data;
                                });
                                smsMessage = 'Message Sent.'
                            } else {
                                smsMessage = 'Message not sent because no number.'
                            }
                            console.log('====')
                            console.log(smsMessage)
                            const successMessage = {
                                message: 'Order Created. ' + smsMessage,
                                status: true
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
                                    message: 'Errror!',
                                    status: false
                                };
                                console.log(errorMessage);
                            }
                            console.log('Stock Updated');
                            console.log(message)
                            res.json(message);
                        });
                    } else {
                        const errorMessage = {
                            message: 'Item Not Found!',
                            status: false
                        };
                        res.json(errorMessage);
                    }

                }
            });
    })

router.route(POST_STOCKS_UPLOAD)
    .post(function (req, res) {
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
            Order.find({ placedTime: { $gte: start, $lt: end } }, function (err, bears) {
                if (err) {
                    console.log('Error');
                    res.send(err);
                }
                currentDayOrders = bears;
                upload.upload(`public/${req.body.filename}.xlsx`, currentDayOrders);
                res.json({ file: `public/${req.body.filename}.xlsx` });
            });
        });
    });

router.route(GET_POST_CLIENTS)
    .post(function (req, res) {
        var client = new Client();
        client.id = uuidv4();
        client.name = req.body.name;
        client.number = req.body.number;
        client.address = req.body.address;
        client.save(function (err) {
            if (err)
                res.send(err);

            res.json({ message: 'Client added!' });
        });
    })
    .get(function (req, res) {
        Client.find(function (err, bears) {
            if (err) {
                console.log('Error');
                res.send(err);
            }

            res.json(bears);
        });
    });

router.route(GET_CLIENTS_ID)
    .get(function (req, res) {
        Client.find({ 'id': { $in: [req.params.id] } })
            .exec(function (err, docs) {
                if (err) {
                    console.log('Not Found!');
                    res.send(err);
                }
                res.json(docs);
            });
    });

router.route(GET_CLIENTS_SEARCH)
    .get(function (req, res) {
        console.log(req.query.q);
        Client.find({ 'name': { $regex: '.*' + req.query.q + '.*', $options: 'i' } })
            .exec(function (err, docs) {
                if (err) {
                    console.log('Not Found!');
                    res.send(err);
                }
                res.json(docs);
            });
    });

/**
 * Mill Order APIs
 */

 
// router.route('/millorder')
// .post(function (req, res) {
//     console.log(req.body.mill)
//     console.log(req.body.billing)
//     MillOrder.find({ 'mill': req.body.mill, 'billing': req.body.billing }).sort({placedTime: 'desc'})
//         .exec(function (err, docs) {
//             if (err) {
//                 console.log('Not Found!');
//                 res.send(err);
//             }
            
//             let number = 0;
//             if (docs != undefined && docs.length >= 1) {
//                   number = docs[0].orderNumber.split("/")[2];
            
//             }
//                 var millOrder = new MillOrder();
//                 millOrder.id = uuidv4();
//                 millOrder.quality = req.body.quality;
//                 millOrder.width = req.body.width;
//                 millOrder.length = req.body.length;
//                 millOrder.gsm = req.body.gsm;
//                 millOrder.buyer = req.body.buyer;
//                 millOrder.shippingaddress = req.body.shippingaddress;
//                 millOrder.quantity = req.body.quantity;
//                 millOrder.placedBy = req.body.placedBy;
//                 millOrder.placedTime = new Date();
//                 millOrder.notes = req.body.notes;
//                 millOrder.status = "Created";
//                 millOrder.mill = req.body.mill;
//                 millOrder.billing = req.body.billing;
//                 millOrder.orderNumber = req.body.billing+'/'+req.body.mill+'/'+(parseInt(number)+1)
                
//                 millOrder.save(function (err) {
//                     if (err)
//                         res.send(err);
//                 res.json({ message: 'Mill Order added!' });
//                 });
//         });
// })
// .get(function (req, res) {
//     MillOrder.find(function (err, bears) {
//         if (err) {
//             console.log('Error');
//             res.send(err);
//         }

//         res.json(bears);
//     });
// });

// // get the last order number for `mill` and `billing`
// router.route('/millorder/number/:mill/:billing')
// .get(function (req, res) {
//     MillOrder.findOne({ 'mill': { $in: [req.params.mill] }, 'billing': { $in: [req.params.billing] } }, {sort:{$natural:-1}})
//         .exec(function (err, docs) {
//             if (err) {
//                 console.log('Not Found!');
//                 res.send(err);
//             }
//             res.json(docs);
//         });
// })

// router.route('/millorder/:id/:status')
// .put(function (req, res) {
//     //update the Stock with the new quantity
//     var id  = req.params.id;
//     var status = req.params.status
//     console.log(id)
//     MillOrder.findOne({ 'id': { $in: [id] } }, function (err, stock) {
//         if (err) {
//             console.log('Order not found to update.');
//             res.status(500).send({
//                 message: 'Error while finding Order, please try again.',
//                 err: err
//             });

//         }
//         //update the stock
//         var curStock = stock;
//         curStock.status = status;
//         console.log(curStock)
//         MillOrder.update({ 'id': id }, curStock, function (err, stock) {
//             if (err) {
//                 console.log('Order not able to update.');
//                 res.status(500).send({
//                     message: 'Error while updating Order, please try again.',
//                     err: err
//                 });
//             }
//             res.json({
//                 message: 'Order Status Updated!'
//             });
//         })
//     })
// });

// router.route('/millorder/:id')
// .get(function (req, res) {
//     MillOrder.find({ 'id': { $in: [req.params.id] } })
//         .exec(function (err, docs) {
//             if (err) {
//                 console.log('Not Found!');
//                 res.send(err);
//             }
//             res.json(docs);
//         });
// })
// .delete(function (req, res) {
//         //get the order details first, so that you can send the message
//         let order = {};
//         MillOrder.find({ 'id': req.params.id }, function (err, bears) {
//             if (err) {
//                 console.log('Error');
//                 res.send(err);
//             }
//             if (bears.length > 0) {
//                 order = bears[0];
//                 MillOrder.remove({ 'id': req.params.id }, function (err, bears) {
//                     if (err) {
//                         console.log('Error');
//                         res.status(500).send({
//                             message: 'Error while clearing, please try again.',
//                             err: err
//                         });
//                     }
//                     res.json({
//                         message: 'Cleared'
//                     });
//                 });
//             } else {
//                 res.json({
//                     message: 'Order Not Found!'
//                 })
//             }

//         });

// });


router.get('/', function (req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});


//for prefixing our api
app.use(errorHandler());
app.use('/api', router);

const findStockById = (id, quantity, res) => {
    console.log(id + '' + quantity);
    Stock.find({ 'id': { $in: [id] }, 'packets': { $gte: parseInt(quantity) } })
        .exec(function (err, docs) {
            if (err) {
                console.log('Error');
                res.send(err);
            }
            console.log(docs);
            res.json(docs);
        });
};

const findPriceByQualityAndBuyer = (quality, buyer, res) => {
    console.log(quality + ' ' + buyer);
    Order.findOne({ 'quality': { $in: [quality] }, 'buyer': { $in: [buyer] } }).sort({ placedTime: -1 })
        .exec(function (err, docs) {
            if (err) {
                console.log('Error');
                res.send(err);
            }
            console.log(docs);
            if(docs === null ) {
                docs = {}
            }
            res.json(docs);
        });
};

app.listen(port);
console.log('Kicked off at ' + port);
