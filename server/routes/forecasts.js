import { Router } from 'express';
import pool from '../db.js';
import * as ss from 'simple-statistics';

const router = Router();

// Get demand forecast and reorder suggestions for all products
router.get('/suggestions', async (req, res) => {
  try {
    // 1. Get all products with their current total stock and recommendation settings
    const productsRes = await pool.query(`
      SELECT p.id, p.name, p.sku, p.reorder_point, p.reorder_qty, 
             p.lead_time_days, p.safety_stock_factor,
             COALESCE(SUM(s.quantity), 0) as current_stock
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      GROUP BY p.id
    `);

    const suggestions = [];

    for (const product of productsRes.rows) {
      // 2. Get historical delivery data for the last 90 days
      const movesRes = await pool.query(`
        SELECT DATE_TRUNC('day', created_at) as date, ABS(SUM(quantity)) as daily_qty
        FROM stock_moves
        WHERE product_id = $1 AND move_type = 'Delivery' AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `, [product.id]);

      let forecastedDailyDemand = 0;
      let trend = 'Stable';
      let confidence = 0;
      let stdDev = 0;

      if (movesRes.rows.length >= 3) {
        const firstDate = new Date(movesRes.rows[0].date).getTime();
        const data = movesRes.rows.map(row => [
          (new Date(row.date).getTime() - firstDate) / (1000 * 60 * 60 * 24),
          parseFloat(row.daily_qty)
        ]);

        const regression = ss.linearRegression(data);
        const lrm = ss.linearRegressionLine(regression);
        
        const lastDayIndex = data[data.length - 1][0];
        forecastedDailyDemand = Math.max(0, lrm(lastDayIndex + 1));
        
        if (regression.m > 0.1) trend = 'Increasing';
        else if (regression.m < -0.1) trend = 'Decreasing';
        
        confidence = Math.min(100, Math.round(ss.sampleCorrelation(data.map(d => d[0]), data.map(d => d[1])) ** 2 * 100));
        stdDev = ss.standardDeviation(movesRes.rows.map(r => parseFloat(r.daily_qty)));
      } else {
        const avgRes = await pool.query(`
          SELECT ABS(AVG(quantity)) as avg_qty, ABS(STDDEV(quantity)) as std_dev
          FROM stock_moves
          WHERE product_id = $1 AND move_type = 'Delivery'
        `, [product.id]);
        forecastedDailyDemand = parseFloat(avgRes.rows[0]?.avg_qty || 0);
        stdDev = parseFloat(avgRes.rows[0]?.std_dev || 0);
        confidence = 20;
      }

      // 3. Smart Stock Calculations
      const currentStock = parseFloat(product.current_stock);
      const leadTime = product.lead_time_days || 7;
      const safetyFactor = parseFloat(product.safety_stock_factor) || 1.5;

      // Safety Stock = Variability * Lead Time (simplified)
      const safetyStock = Math.ceil(stdDev * safetyFactor * Math.sqrt(leadTime));
      const recommendedROP = Math.ceil((forecastedDailyDemand * leadTime) + safetyStock);
      const recommendedMax = Math.ceil(recommendedROP + (product.reorder_qty || 20));

      let suggestion = 'Maintain';
      let suggestedQty = 0;
      let reason = 'Stock levels are optimal.';

      const daysUntilStockout = forecastedDailyDemand > 0 ? Math.floor(currentStock / forecastedDailyDemand) : Infinity;

      if (currentStock <= recommendedROP) {
        suggestion = 'Reorder Now';
        suggestedQty = product.reorder_qty || Math.ceil(forecastedDailyDemand * 30);
        reason = `Current stock (${currentStock}) is below AI recommended reorder point (${recommendedROP}).`;
      } else if (daysUntilStockout <= leadTime) {
        suggestion = 'Reorder Soon';
        suggestedQty = product.reorder_qty || Math.ceil(forecastedDailyDemand * 30);
        reason = `Predicted stockout in ${daysUntilStockout} days is less than lead time (${leadTime} days).`;
      } else if (currentStock > recommendedMax) {
        suggestion = 'Overstocked';
        reason = `Current stock exceeds recommended max level of ${recommendedMax}.`;
      }

      suggestions.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock,
        forecastedDailyDemand: parseFloat(forecastedDailyDemand.toFixed(2)),
        daysUntilStockout: daysUntilStockout === Infinity ? null : daysUntilStockout,
        trend,
        confidence,
        suggestion,
        suggestedQty,
        reason,
        recommendations: {
          safetyStock,
          reorderPoint: recommendedROP,
          maxStock: recommendedMax,
          leadTime
        },
        currentSettings: {
          reorderPoint: product.reorder_point,
          reorderQty: product.reorder_qty
        }
      });
    }

    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate forecasts' });
  }
});

// Get detailed forecast for a specific product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get historical data for chart
    const historyRes = await pool.query(`
      SELECT DATE_TRUNC('day', created_at) as date, ABS(SUM(quantity)) as quantity
      FROM stock_moves
      WHERE product_id = $1 AND move_type = 'Delivery'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
      LIMIT 30
    `, [id]);

    // Simple projection for next 7 days
    const history = historyRes.rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      quantity: parseFloat(r.quantity),
      type: 'actual'
    }));

    // If we have history, project
    let projection = [];
    if (history.length >= 2) {
      const data = history.map((h, i) => [i, h.quantity]);
      const reg = ss.linearRegression(data);
      const line = ss.linearRegressionLine(reg);
      
      const lastDate = new Date(history[history.length - 1].date);
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        projection.push({
          date: nextDate.toISOString().split('T')[0],
          quantity: Math.max(0, parseFloat(line(history.length + i - 1).toFixed(2))),
          type: 'forecast'
        });
      }
    }

    res.json({
      history,
      forecast: projection
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get product forecast' });
  }
});

export default router;
