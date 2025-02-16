import xlsx from 'xlsx';
import Stock from '../models/Stock.js';
import uploadConfig from './uploadConfig.js';

export const upload = async (sourceFile, currentDayOrders) => {
  try {
    const workbook = xlsx.readFile(sourceFile);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Clear existing stocks before upload
    await Stock.deleteMany({});
    
    let row = uploadConfig.header.rows;
    let cell = worksheet[`A${row}`];
    
    while (cell != null && cell.v.trim() !== "") {
      const stockData = {};
      
      // Map columns to keys based on config
      for (const [col, key] of Object.entries(uploadConfig.columnToKey)) {
        const cellValue = worksheet[`${col}${row}`];
        if (cellValue) {
          stockData[key] = cellValue.v;
        }
      }
      
      // Check if this quality exists in today's orders
      const qualityOrders = currentDayOrders.filter(
        order => order.quality === stockData.quality
      );
      
      if (qualityOrders.length > 0) {
        const totalOrderedPackets = qualityOrders.reduce(
          (sum, order) => sum + parseInt(order.packets || 0), 
          0
        );
        stockData.packets = parseInt(stockData.packets || 0) - totalOrderedPackets;
      }
      
      // Create new stock entry
      const stock = new Stock(stockData);
      await stock.save();
      
      row++;
      cell = worksheet[`A${row}`];
    }
    
    return true;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}; 