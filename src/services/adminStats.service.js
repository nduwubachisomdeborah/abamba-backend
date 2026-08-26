import User from "../models/user.model.js";
import Order from "../models/order.model.js";

class AdminStatsService {
  /**
   * Gathers statistics for the admin dashboard.
   * @returns {Promise<Object>} An object containing various statistics.
   */
  async getStats() {
    // Total amount of payments for completed payments (paid orders)
    const paymentAgg = await Order.aggregate([
      {
        $match: {
          deleted: { $ne: true },
          "payment.status": "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$payment.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentsAmount = paymentAgg.length > 0 ? paymentAgg[0].totalAmount : 0;
    const ordersPaidCount = paymentAgg.length > 0 ? paymentAgg[0].count : 0;

    // Top 10 selling products
    const topSellingProducts = await Order.aggregate([
      { $match: { "payment.status": "completed", deleted: { $ne: true } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalAmountSold: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalCountSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalAmountSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 0,
          product: "$productInfo",
          totalAmountSold: 1,
          totalCountSold: 1,
        },
      },
    ]);

    // User and seller counts (exclude soft-deleted)
    const [usersCount, sellersCount] = await Promise.all([
      User.countDocuments({ role: "user", deleted: { $ne: true } }),
      User.countDocuments({ role: "seller", deleted: { $ne: true } }),
    ]);

    // Hourly sales chart data for the current day
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const hourlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          "payment.status": "completed",
        },
      },
      {
        $group: {
          _id: { $hour: { date: "$createdAt", timezone: "UTC" } }, // Group by hour in UTC
          sales: { $sum: "$payment.amount" },
        },
      },
      { $sort: { _id: 1 } }, // Sort by hour
    ]);

    // Format data for chart, filling in hours with no sales
    const chartData = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlySales.find((h) => h._id === i);
      const hour = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? "am" : "pm";
      return {
        time: `${hour}${ampm}`,
        sales: hourData ? hourData.sales : 0,
      };
    });

    // Monthly sales data for the current year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lt: endOfYear },
          "payment.status": "completed",
        },
      },
      {
        $group: {
          _id: { $month: { date: "$createdAt", timezone: "UTC" } }, // Group by month
          sales: { $sum: "$payment.amount" },
        },
      },
      { $sort: { _id: 1 } }, // Sort by month
    ]);

    // Format data for chart, filling in months with no sales
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salesData = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlySales.find((m) => m._id === i + 1);
      return {
        month: monthNames[i],
        sales: monthData ? monthData.sales : 0,
      };
    });

    // State-based order statistics
    const totalOrders = await Order.countDocuments({ deleted: { $ne: true } });
    const stateDistribution = await Order.aggregate([
      { $match: { deleted: { $ne: true }, "shippingAddress.state": { $ne: null } } },
      { $group: { _id: "$shippingAddress.state", count: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          state: "$_id",
          count: 1,
          percentage: {
            $cond: [
              { $eq: [totalOrders, 0] },
              0,
              { $multiply: [{ $divide: ["$count", totalOrders] }, 100] },
            ],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      paymentsAmount,
      ordersPaidCount,
      usersCount,
      sellersCount,
      topSellingProducts,
      chartData,
      salesData,
      stateDistribution,
    };
  }
}

export default new AdminStatsService();
