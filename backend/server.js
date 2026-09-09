const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// =====================================================
// LOAD BIẾN MÔI TRƯỜNG
// =====================================================
dotenv.config();

// =====================================================
// IMPORT ROUTES
// =====================================================
const authRoutes =
  require("./routes/auth");

const productRoutes =
  require("./routes/products");

const orderRoutes =
  require("./routes/orders");

const aiRoutes =
  require("./routes/ai");

const userRoutes =
  require("./routes/users");

const reviewRoutes =
  require("./routes/reviews");

const couponRoutes =
  require("./routes/coupons");

// =====================================================
// KHỞI TẠO EXPRESS
// =====================================================
const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// =====================================================
// ROUTE KIỂM TRA SERVER
// =====================================================
app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "ClothStore API đang hoạt động",
    });
  }
);

// =====================================================
// API ROUTES
// =====================================================
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/coupons",
  couponRoutes
);

// =====================================================
// ROUTE KHÔNG TỒN TẠI
// =====================================================
app.use(
  (req, res) => {
    res
      .status(404)
      .json({
        success: false,
        message:
          `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
      });
  }
);

// =====================================================
// XỬ LÝ LỖI SERVER
// =====================================================
app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    res
      .status(
        error.status ||
          500
      )
      .json({
        success: false,
        message:
          error.message ||
          "Lỗi máy chủ",
      });
  }
);

// =====================================================
// KẾT NỐI MONGODB
// =====================================================
const PORT =
  process.env.PORT ||
  5000;

const MONGODB_URI =
  process.env
    .MONGODB_URI ||
  "mongodb://127.0.0.1:27017/clothstore";

mongoose
  .connect(
    MONGODB_URI
  )
  .then(() => {
    console.log(
      "✅ Kết nối MongoDB thành công"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `✅ ClothStore Backend đang chạy tại http://localhost:${PORT}`
        );

        console.log(
          `✅ Health: http://localhost:${PORT}/api/health`
        );

        console.log(
          `✅ Products: http://localhost:${PORT}/api/products`
        );

        console.log(
          `✅ Orders: http://localhost:${PORT}/api/orders`
        );

        console.log(
          `✅ Coupons: http://localhost:${PORT}/api/coupons`
        );
      }
    );
  })
  .catch(
    (error) => {
      console.error(
        "❌ Không thể kết nối MongoDB:"
      );

      console.error(
        error
      );

      process.exit(1);
    }
  );