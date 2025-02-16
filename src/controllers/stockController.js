import Stock from '../models/Stock.js';
import Order from '../models/Order.js';
import { upload } from '../utils/upload.js';

export const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const createStock = async (req, res) => {
  try {
    const stock = new Stock({
      id: req.body.id,
      ProductName: req.body.ProductName,
      alt: req.body.alt
    });
    await stock.save();
    res.json({ message: "Stock created!" });
  } catch (err) {
    res.status(500).send(err);
  }
};

export const updateStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({ quality: req.body.quality });
    if (!stock) {
      return res.status(500).send({
        message: "Error while finding stock, please try again."
      });
    }
    
    const updatedPackets = parseInt(req.body.packets) + parseInt(stock.packets);
    stock.packets = updatedPackets;
    
    await Stock.updateOne({ id: stock.id }, stock);
    res.json({ message: "Stock Updated!" });
  } catch (err) {
    res.status(500).send({
      message: "Error while updating stock, please try again.",
      err: err,
    });
  }
};

export const searchStocks = async (req, res) => {
  try {
    const searchString = req.query.q;
    const docs = await Stock.find({ $text: { $search: `"${searchString}"` } });
    res.json(docs);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const clearStocks = async (req, res) => {
  try {
    await Stock.deleteMany({});
    res.json({ message: "Cleared" });
  } catch (err) {
    res.status(500).send({
      message: "Error while clearing, please try again.",
      err: err,
    });
  }
};

export const createStockOrder = async (req, res) => {
  try {
    const docs = await Stock.find({
      id: req.body.id,
      packets: { $gte: parseInt(req.body.quantity) }
    });

    if (!docs || docs.length === 0) {
      return res.json({ message: "Item Not Found!", status: false });
    }

    const stock = docs[0];
    stock.packets -= req.body.quantity;
    await stock.save();
    
    res.json({ message: "Stock Updated!", status: true });
  } catch (err) {
    res.status(500).send(err);
  }
};

export const uploadStock = async (req, res) => {
  try {
    const imageFile = req.files.file;
    const filePath = `${process.cwd()}/public/${req.body.filename}.xlsx`;
    
    await imageFile.mv(filePath);
    
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const currentDayOrders = await Order.find({ 
      placedTime: { $gte: start, $lt: end } 
    });
    
    await upload(filePath, currentDayOrders);
    res.json({ file: `public/${req.body.filename}.xlsx` });
  } catch (err) {
    res.status(500).send(err);
  }
}; 