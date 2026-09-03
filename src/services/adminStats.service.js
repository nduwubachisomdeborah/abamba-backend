import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import paymentService from "./payment.service.js";

class AdminStatsService {
  /**
   * Gathers statistics for the admin dashboard.
   * @returns {Promise<Object>} An object containing various statistics.
   */
  async getStats() {
    // Auto-reconcile any pending Paystack transactions before computing statistics
    await paymentService.reconcilePendingPayments().catch(() => {});

    // Total amount of payments for completed payments (paid orders)
    const paidMatch = {
      deleted: { $ne: true },
      $or: [
        { "payment.status": "completed" },
        { "payment.status": "paid" },
        { paymentStatus: "paid" },
        { status: "processing" },
        { status: "completed" },
        { status: "delivered" },
      ],
    };

    const paymentAgg = await Order.aggregate([
      {
        $match: paidMatch,
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
    let topSellingProducts = await Order.aggregate([
      { $match: paidMatch },
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

    // Fallback: If no completed paid orders yet, show top products by existing order activity
    if (!topSellingProducts || topSellingProducts.length === 0) {
      topSellingProducts = await Order.aggregate([
        { $match: { deleted: { $ne: true } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalAmountSold: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            totalCountSold: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalCountSold: -1 } },
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
    }

    // User and seller counts (exclude soft-deleted and temporary guests)
    const [usersCount, sellersCount] = await Promise.all([
      User.countDocuments({ role: "user", deleted: { $ne: true }, isGuest: { $ne: true } }),
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
          ...paidMatch,
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
          ...paidMatch,
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

    // Regional performance metrics for Imo and Abia states
    const [
      imoBuyersCount,
      abiaBuyersCount,
      imoSellersCount,
      abiaSellersCount,
      regionalOrdersAgg,
    ] = await Promise.all([
      User.countDocuments({
        deleted: { $ne: true },
        isGuest: { $ne: true },
        role: { $in: ["user", "customer"] },
        "addresses.state": { $regex: /imo/i },
      }),
      User.countDocuments({
        deleted: { $ne: true },
        isGuest: { $ne: true },
        role: { $in: ["user", "customer"] },
        "addresses.state": { $regex: /abia/i },
      }),
      User.countDocuments({
        deleted: { $ne: true },
        role: "seller",
        $or: [
          { "business.businessAddress.state": { $regex: /imo/i } },
          { "addresses.state": { $regex: /imo/i } },
        ],
      }),
      User.countDocuments({
        deleted: { $ne: true },
        role: "seller",
        $or: [
          { "business.businessAddress.state": { $regex: /abia/i } },
          { "addresses.state": { $regex: /abia/i } },
        ],
      }),
      Order.aggregate([
        {
          $match: {
            deleted: { $ne: true },
            "payment.status": { $in: ["completed", "paid"] },
            "shippingAddress.state": { $regex: /^(imo|abia)$/i },
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: "$shippingAddress.state", regex: /imo/i } },
                "Imo",
                "Abia",
              ],
            },
            ordersCount: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$payment.amount", "$total"] } },
          },
        },
      ]),
    ]);

    const orderStatsByState = regionalOrdersAgg.reduce((acc, curr) => {
      acc[curr._id] = {
        ordersCount: curr.ordersCount || 0,
        revenue: curr.revenue || 0,
      };
      return acc;
    }, {});

    const imoOrders = orderStatsByState["Imo"] || { ordersCount: 0, revenue: 0 };
    const abiaOrders = orderStatsByState["Abia"] || { ordersCount: 0, revenue: 0 };

    const totalPaidOrders = ordersPaidCount > 0 
      ? ordersPaidCount 
      : (imoOrders.ordersCount + abiaOrders.ordersCount);

    const regionalPerformance = [
      {
        state: "Imo",
        hub: "Owerri Hub",
        coordinates: { lat: 5.4891, lng: 7.0176 },
        buyersCount: imoBuyersCount,
        sellersCount: imoSellersCount,
        totalUsers: imoBuyersCount + imoSellersCount,
        ordersCount: imoOrders.ordersCount,
        revenue: imoOrders.revenue,
        percentage: totalPaidOrders > 0 
          ? Math.round((imoOrders.ordersCount / totalPaidOrders) * 100) 
          : 0,
      },
      {
        state: "Abia",
        hub: "Aba / Umuahia Hub",
        coordinates: { lat: 5.1065, lng: 7.3667 },
        buyersCount: abiaBuyersCount,
        sellersCount: abiaSellersCount,
        totalUsers: abiaBuyersCount + abiaSellersCount,
        ordersCount: abiaOrders.ordersCount,
        revenue: abiaOrders.revenue,
        percentage: totalPaidOrders > 0 
          ? Math.round((abiaOrders.ordersCount / totalPaidOrders) * 100) 
          : 0,
      },
    ];

    return {
      paymentsAmount,
      ordersPaidCount,
      usersCount,
      sellersCount,
      topSellingProducts,
      chartData,
      salesData,
      stateDistribution,
      regionalPerformance,
    };
  }

  async getAdminStats() {
    return this.getStats();
  }
}

export default new AdminStatsService();
