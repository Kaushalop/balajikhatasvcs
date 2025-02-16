import Order from '../models/Order.js';
import { sendSMS } from '../utils/smsService.js';

export const getOrders = async (req, res) => {
  try {
    const start = req.query.start;
    const end = req.query.end;
    
    const orders = await Order.find({ placedTime: { $gte: start, $lt: end } });
    res.json(orders);
  } catch (err) {
    console.log("Error");
    res.status(500).send(err);
  }
};

export const getLastPrice = async (req, res) => {
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
};

export const updateOrderShipped = async (req, res) => {
  try {
    const orders = await Order.find({ id: req.params.id });
    if (orders.length > 0) {
      const order = orders[0];
      order.shipped = "YES";
      
      await Order.updateOne({ id: order.id }, order);
      
      if (order.buyerNumber) {
        await sendSMS(
          order.buyerNumber,
          `${order.quantity} packets ${order.quality}. Billing: ${order.buyer}, Shipped: ${order.consignee}.%nThe above order has been shipped by Balaji Pratishthan.`
        );
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
};

export const deleteOrder = async (req, res) => {
  try {
    const orders = await Order.find({ id: req.params.id });
    if (orders.length > 0) {
      const order = orders[0];
      await Order.deleteOne({ id: req.params.id });
      
      if (order.buyerNumber) {
        await sendSMS(
          order.buyerNumber,
          `${order.quantity} packets ${order.quality}. Billing: ${order.buyer}, Shipped: ${order.consignee}.%nThe above order has been cancelled by Balaji Pratishthan, please inform the concerned person in case of discrepancy.`
        );
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
}; 