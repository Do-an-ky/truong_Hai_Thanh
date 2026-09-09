import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "./AdminCharts.css";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const formatPrice = (value) =>
  Number(value || 0).toLocaleString("vi-VN") + " ₫";

const normalizeStatus = (status) => {
  const map = {
    pending: "Chờ xác nhận",
    processing: "Đã xác nhận",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
    "Chờ xác nhận": "Chờ xác nhận",
    "Đã xác nhận": "Đã xác nhận",
    "Đang giao": "Đang giao",
    "Đã giao": "Đã giao",
    "Đã hủy": "Đã hủy",
    "Trâu xác nhận": "Chờ xác nhận",
  };

  return map[status] || status || "Chờ xác nhận";
};

export default function AdminCharts({ orders = [] }) {
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = orders
      .map((order) => {
        const date = new Date(order.createdAt);
        return Number.isNaN(date.getTime()) ? null : date.getFullYear();
      })
      .filter(Boolean);

    return [...new Set([currentYear, ...years])].sort((a, b) => b - a);
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState(
    () => new Date().getFullYear()
  );

  const ordersInSelectedYear = useMemo(() => {
    return orders.filter((order) => {
      if (!order.createdAt) return false;
      const date = new Date(order.createdAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(selectedYear)
      );
    });
  }, [orders, selectedYear]);

  const statusStats = useMemo(() => {
    const stats = {
      "Chờ xác nhận": 0,
      "Đã xác nhận": 0,
      "Đang giao": 0,
      "Đã giao": 0,
      "Đã hủy": 0,
    };

    ordersInSelectedYear.forEach((order) => {
      const status = normalizeStatus(order.status);
      if (Object.prototype.hasOwnProperty.call(stats, status)) {
        stats[status] += 1;
      }
    });

    return stats;
  }, [orders]);

  const monthlyRevenue = useMemo(() => {
    const values = Array(12).fill(0);

    ordersInSelectedYear.forEach((order) => {
      if (normalizeStatus(order.status) !== "Đã giao") return;

      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) return;

      values[date.getMonth()] += Number(order.total || 0);
    });

    return { year: selectedYear, values };
  }, [ordersInSelectedYear, selectedYear]);

  const monthlyOrders = useMemo(() => {
    const values = Array(12).fill(0);

    ordersInSelectedYear.forEach((order) => {
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) return;
      values[date.getMonth()] += 1;
    });

    return values;
  }, [ordersInSelectedYear]);

  const topProducts = useMemo(() => {
    const productMap = new Map();

    ordersInSelectedYear.forEach((order) => {
      if (normalizeStatus(order.status) !== "Đã giao") return;

      (order.items || []).forEach((item) => {
        const key = String(item.productId || item.name || "unknown");
        const current = productMap.get(key) || {
          name: item.name || "Sản phẩm",
          quantity: 0,
          revenue: 0,
        };

        const quantity = Number(item.quantity || 0);
        current.quantity += quantity;
        current.revenue += quantity * Number(item.price || 0);
        productMap.set(key, current);
      });
    });

    return [...productMap.values()]
      .sort((a, b) =>
        b.quantity !== a.quantity
          ? b.quantity - a.quantity
          : b.revenue - a.revenue
      )
      .slice(0, 5);
  }, [ordersInSelectedYear]);

  const orderStatusData = {
    labels: ["Chờ xác nhận", "Đã xác nhận", "Đang giao", "Đã giao", "Đã hủy"],
    datasets: [
      {
        label: "Số đơn",
        data: [
          statusStats["Chờ xác nhận"],
          statusStats["Đã xác nhận"],
          statusStats["Đang giao"],
          statusStats["Đã giao"],
          statusStats["Đã hủy"],
        ],
        backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#22c55e", "#ef4444"],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const revenueData = {
    labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
    datasets: [
      {
        label: "Doanh thu",
        data: monthlyRevenue.values,
        backgroundColor: "#4f63f6",
        borderRadius: 7,
        maxBarThickness: 42,
      },
    ],
  };

  const orderMonthData = {
    labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
    datasets: [
      {
        label: "Số đơn",
        data: monthlyOrders,
        backgroundColor: "#172b4d",
        borderRadius: 7,
        maxBarThickness: 42,
      },
    ],
  };

  const topProductData = {
    labels: topProducts.map((product) => product.name),
    datasets: [
      {
        label: "Số lượng bán",
        data: topProducts.map((product) => product.quantity),
        backgroundColor: "#ff6fa3",
        borderRadius: 7,
        maxBarThickness: 42,
      },
    ],
  };

  const topProductOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw} sản phẩm đã bán`,
        },
      },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
      y: { grid: { display: false } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 18, boxWidth: 10 },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} đơn`,
        },
      },
    },
  };

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${formatPrice(context.raw)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: {
          callback: (value) => {
            if (value >= 1000000) {
              return (value / 1000000).toLocaleString("vi-VN") + "tr";
            }
            if (value >= 1000) {
              return (value / 1000).toLocaleString("vi-VN") + "k";
            }
            return value;
          },
        },
      },
    },
  };

  const orderMonthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw} đơn`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: { precision: 0 },
      },
    },
  };

  const totalYearRevenue = monthlyRevenue.values.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const totalYearOrders = monthlyOrders.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return (
    <div className="admin-chart-section">
      <div className="admin-chart-heading">
        <div>
          <h2>📊 Thống kê cửa hàng</h2>
          <p>
            Doanh thu, đơn hàng và sản phẩm bán chạy năm {selectedYear}.
          </p>
        </div>

        <label className="admin-chart-year">
          <span>Năm thống kê</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-chart-grid">
        <div className="admin-chart-card">
          <div className="admin-chart-card-header">
            <div>
              <h3>Trạng thái đơn hàng</h3>
              <p>Phân bố đơn hàng trong năm {selectedYear}.</p>
            </div>
            <strong>{totalYearOrders}</strong>
          </div>

          <div className="admin-chart-doughnut">
            {totalYearOrders > 0 ? (
              <Doughnut data={orderStatusData} options={doughnutOptions} />
            ) : (
              <div className="admin-chart-empty">Chưa có dữ liệu đơn hàng</div>
            )}
          </div>
        </div>

        <div className="admin-chart-card admin-chart-card-wide">
          <div className="admin-chart-card-header">
            <div>
              <h3>Doanh thu theo tháng</h3>
              <p>Chỉ tính các đơn hàng đã giao.</p>
            </div>
            <strong>{formatPrice(totalYearRevenue)}</strong>
          </div>

          <div className="admin-chart-bar">
            <Bar data={revenueData} options={revenueOptions} />
          </div>
        </div>
      </div>

      <div className="admin-chart-card admin-chart-orders-month">
        <div className="admin-chart-card-header">
          <div>
            <h3>Số đơn hàng theo tháng</h3>
            <p>
              Số lượng đơn phát sinh trong từng tháng của năm {monthlyRevenue.year}.
            </p>
          </div>
          <strong>{totalYearOrders} đơn</strong>
        </div>

        <div className="admin-chart-bar">
          <Bar data={orderMonthData} options={orderMonthOptions} />
        </div>
      </div>

      <div className="admin-chart-card admin-chart-orders-month">
        <div className="admin-chart-card-header">
          <div>
            <h3>🏆 Top sản phẩm bán chạy</h3>
            <p>Top 5 sản phẩm theo số lượng trong các đơn đã giao năm {selectedYear}.</p>
          </div>
          <strong>{topProducts.length}</strong>
        </div>

        <div className="admin-chart-bar">
          {topProducts.length > 0 ? (
            <Bar data={topProductData} options={topProductOptions} />
          ) : (
            <div className="admin-chart-empty">
              Chưa có sản phẩm đã giao trong năm {selectedYear}
            </div>
          )}
        </div>

        {topProducts.length > 0 && (
          <div className="admin-chart-ranking">
            {topProducts.map((product, index) => (
              <div className="admin-chart-ranking-row" key={`${product.name}-${index}`}>
                <span><b>#{index + 1}</b> {product.name}</span>
                <span>
                  <strong>{product.quantity}</strong> sản phẩm · {formatPrice(product.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
