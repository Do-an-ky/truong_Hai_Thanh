const express = require("express");

const Order =
  require("../models/Order");

const Product =
  require("../models/Product");

const Coupon =
  require("../models/Coupon");

const {
  protect,
  adminOnly,
} = require("../middleware/auth");

const router =
  express.Router();

// =====================================================
// TRẠNG THÁI ĐƠN HÀNG
// =====================================================
const ALLOWED_STATUS = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang giao",
  "Đã giao",
  "Đã hủy",
];

// =====================================================
// TẠO MÃ ĐƠN
// =====================================================
const createOrderCode = () => {
  return (
    "DH" +
    Date.now()
      .toString()
      .slice(-10)
  );
};

// =====================================================
// HOÀN TỒN KHO
// =====================================================
const restoreOrderStock =
  async (order) => {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stock:
              Number(
                item.quantity || 0
              ),
          },
        }
      );
    }
  };

// =====================================================
// KIỂM TRA TỒN KHO KHI KHÔI PHỤC ĐƠN
// =====================================================
const checkStockForOrder =
  async (order) => {
    const products = [];

    for (const item of order.items) {
      const product =
        await Product.findById(
          item.productId
        );

      if (!product) {
        throw new Error(
          `Sản phẩm "${item.name}" không còn tồn tại`
        );
      }

      const quantity =
        Number(
          item.quantity || 0
        );

      if (
        product.stock <
        quantity
      ) {
        throw new Error(
          `Sản phẩm "${product.name}" chỉ còn ${product.stock}`
        );
      }

      products.push({
        product,
        quantity,
      });
    }

    return products;
  };

// =====================================================
// TRỪ TỒN KHO
// =====================================================
const deductOrderStock =
  async (
    checkedProducts
  ) => {
    for (
      const item
      of checkedProducts
    ) {
      await Product.findByIdAndUpdate(
        item.product._id,
        {
          $inc: {
            stock:
              -item.quantity,
          },
        }
      );
    }
  };

// =====================================================
// KIỂM TRA VOUCHER
// =====================================================
const calculateCoupon =
  async ({
    couponCode,
    subtotal,
    shipping,
  }) => {
    if (!couponCode) {
      return {
        coupon: null,
        couponCode: "",
        discount: 0,
        shippingDiscount: 0,
      };
    }

    const normalizedCode =
      String(couponCode)
        .trim()
        .toUpperCase();

    const coupon =
      await Coupon.findOne({
        code: normalizedCode,
      });

    if (!coupon) {
      throw new Error(
        "Mã giảm giá không tồn tại"
      );
    }

    const now =
      new Date();

    if (!coupon.active) {
      throw new Error(
        "Mã giảm giá đã bị vô hiệu hóa"
      );
    }

    if (
      coupon.startDate &&
      now <
        new Date(
          coupon.startDate
        )
    ) {
      throw new Error(
        "Mã giảm giá chưa đến thời gian sử dụng"
      );
    }

    if (
      coupon.endDate &&
      now >
        new Date(
          coupon.endDate
        )
    ) {
      throw new Error(
        "Mã giảm giá đã hết hạn"
      );
    }

    if (
      coupon.usageLimit > 0 &&
      coupon.usedCount >=
        coupon.usageLimit
    ) {
      throw new Error(
        "Mã giảm giá đã hết lượt sử dụng"
      );
    }

    if (
      subtotal <
      Number(
        coupon.minOrder || 0
      )
    ) {
      throw new Error(
        `Đơn hàng phải từ ${Number(
          coupon.minOrder
        ).toLocaleString(
          "vi-VN"
        )} ₫ để sử dụng mã này`
      );
    }

    let discount = 0;

    let shippingDiscount =
      0;

    if (
      coupon.type ===
      "PERCENT"
    ) {
      discount =
        subtotal *
        (
          Number(
            coupon.value || 0
          ) /
          100
        );

      if (
        coupon.maxDiscount >
        0
      ) {
        discount =
          Math.min(
            discount,
            coupon.maxDiscount
          );
      }
    }

    if (
      coupon.type ===
      "FIXED"
    ) {
      discount =
        Number(
          coupon.value || 0
        );

      discount =
        Math.min(
          discount,
          subtotal
        );
    }

    if (
      coupon.type ===
      "FREESHIP"
    ) {
      shippingDiscount =
        shipping;
    }

    discount =
      Math.round(
        discount
      );

    shippingDiscount =
      Math.round(
        shippingDiscount
      );

    return {
      coupon,
      couponCode:
        coupon.code,
      discount,
      shippingDiscount,
    };
  };

// =====================================================
// TẠO ĐƠN HÀNG
// POST /api/orders
// =====================================================
router.post(
  "/",
  protect,
  async (
    req,
    res
  ) => {
    try {
      const {
        customer,
        items,
        couponCode,
      } = req.body;

      if (
        !customer ||
        !customer.name ||
        !customer.phone ||
        !customer.address
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ",
          });
      }

      if (
        !Array.isArray(
          items
        ) ||
        items.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Đơn hàng phải có ít nhất một sản phẩm",
          });
      }

      const orderItems = [];

      for (
        const item
        of items
      ) {
        if (
          !item.productId
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Sản phẩm thiếu productId",
            });
        }

        const product =
          await Product.findById(
            item.productId
          );

        if (!product) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "Không tìm thấy sản phẩm",
            });
        }

        const quantity =
          Number(
            item.quantity
          );

        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                `Số lượng không hợp lệ: ${product.name}`,
            });
        }

        if (
          Number(
            product.stock || 0
          ) <
          quantity
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                `Sản phẩm "${product.name}" chỉ còn ${product.stock}`,
            });
        }

        if (
          item.size &&
          Array.isArray(
            product.sizes
          ) &&
          product.sizes
            .length > 0 &&
          !product.sizes
            .includes(
              item.size
            )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                `Size "${item.size}" không hợp lệ`,
            });
        }

        if (
          item.color &&
          Array.isArray(
            product.colors
          ) &&
          product.colors
            .length > 0 &&
          !product.colors
            .includes(
              item.color
            )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                `Màu "${item.color}" không hợp lệ`,
            });
        }

        orderItems.push({
          productId:
            product._id,

          name:
            product.name,

          price:
            Number(
              product.price
            ),

          image:
            product.image || "",

          size:
            item.size || "",

          color:
            item.color || "",

          quantity,
        });
      }

      // =================================================
      // BACKEND TỰ TÍNH TIỀN
      // =================================================
      const subtotal =
        orderItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.price *
              item.quantity,
          0
        );

      const shipping =
        subtotal >= 500000
          ? 0
          : 30000;

      // =================================================
      // BACKEND TỰ KIỂM TRA VOUCHER
      // =================================================
      let couponResult;

      try {
        couponResult =
          await calculateCoupon({
            couponCode,
            subtotal,
            shipping,
          });
      } catch (error) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              error.message,
          });
      }

      const discount =
        couponResult.discount;

      const shippingDiscount =
        couponResult.shippingDiscount;

      const total =
        Math.max(
          0,
          subtotal +
            shipping -
            discount -
            shippingDiscount
        );

      const order =
        await Order.create({
          orderCode:
            createOrderCode(),

          user:
            req.user._id,

          customer: {
            name:
              customer.name.trim(),

            phone:
              customer.phone.trim(),

            address:
              customer.address.trim(),

            note:
              customer.note
                ? customer.note.trim()
                : "",

            payment:
              customer.payment ===
              "BANK"
                ? "BANK"
                : "COD",
          },

          items:
            orderItems,

          subtotal,

          shipping,

          couponCode:
            couponResult
              .couponCode,

          discount,

          shippingDiscount,

          total,

          status:
            "Chờ xác nhận",

          paymentStatus:
            "Chưa thanh toán",

          paidAt:
            null,
        });

      // =================================================
      // TRỪ KHO
      // =================================================
      for (
        const item
        of orderItems
      ) {
        await Product.findByIdAndUpdate(
          item.productId,
          {
            $inc: {
              stock:
                -item.quantity,
            },
          }
        );
      }

      // =================================================
      // TĂNG LƯỢT SỬ DỤNG VOUCHER
      // =================================================
      if (
        couponResult.coupon
      ) {
        await Coupon.findByIdAndUpdate(
          couponResult
            .coupon._id,
          {
            $inc: {
              usedCount: 1,
            },
          }
        );
      }

      res
        .status(201)
        .json({
          success: true,

          message:
            "Đặt hàng thành công",

          order,
        });
    } catch (error) {
      console.error(
        "Create order error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Không thể tạo đơn hàng",
        });
    }
  }
);

// =====================================================
// ĐƠN HÀNG CỦA USER
// =====================================================
router.get(
  "/my-orders",
  protect,
  async (
    req,
    res
  ) => {
    try {
      const orders =
        await Order.find({
          user:
            req.user._id,
        }).sort({
          createdAt: -1,
        });

      res.json({
        success: true,
        count:
          orders.length,
        orders,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            "Không thể lấy lịch sử đơn hàng",
        });
    }
  }
);

// =====================================================
// ADMIN - TẤT CẢ ĐƠN
// =====================================================
router.get(
  "/",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const orders =
        await Order.find()
          .populate(
            "user",
            "name email role"
          )
          .sort({
            createdAt: -1,
          });

      res.json({
        success: true,
        count:
          orders.length,
        orders,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            "Không thể lấy danh sách đơn hàng",
        });
    }
  }
);

// =====================================================
// ADMIN - TRẠNG THÁI ĐƠN
// =====================================================
router.put(
  "/:id/status",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const {
        status,
      } = req.body;

      if (
        !ALLOWED_STATUS
          .includes(
            status
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Trạng thái không hợp lệ",
          });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Không tìm thấy đơn hàng",
          });
      }

      const oldStatus =
        order.status;

      if (
        oldStatus ===
        status
      ) {
        return res.json({
          success: true,
          order,
        });
      }

      if (
        oldStatus !==
          "Đã hủy" &&
        status ===
          "Đã hủy"
      ) {
        await restoreOrderStock(
          order
        );
      }

      if (
        oldStatus ===
          "Đã hủy" &&
        status !==
          "Đã hủy"
      ) {
        const checkedProducts =
          await checkStockForOrder(
            order
          );

        await deductOrderStock(
          checkedProducts
        );
      }

      order.status =
        status;

      await order.save();

      await order.populate(
        "user",
        "name email role"
      );

      res.json({
        success: true,

        message:
          "Cập nhật trạng thái thành công",

        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Không thể cập nhật trạng thái",
        });
    }
  }
);

// =====================================================
// ADMIN - TRẠNG THÁI THANH TOÁN
// =====================================================
router.put(
  "/:id/payment-status",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const {
        paymentStatus,
      } = req.body;

      const allowed = [
        "Chưa thanh toán",
        "Đã thanh toán",
      ];

      if (
        !allowed.includes(
          paymentStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Trạng thái thanh toán không hợp lệ",
          });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Không tìm thấy đơn hàng",
          });
      }

      order.paymentStatus =
        paymentStatus;

      order.paidAt =
        paymentStatus ===
        "Đã thanh toán"
          ? order.paidAt ||
            new Date()
          : null;

      await order.save();

      await order.populate(
        "user",
        "name email role"
      );

      res.json({
        success: true,

        message:
          paymentStatus ===
          "Đã thanh toán"
            ? "Đã xác nhận thanh toán"
            : "Đã chuyển về chưa thanh toán",

        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            "Không thể cập nhật thanh toán",
        });
    }
  }
);

// =====================================================
// USER - HỦY ĐƠN
// =====================================================
router.put(
  "/:id/cancel",
  protect,
  async (
    req,
    res
  ) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Không tìm thấy đơn hàng",
          });
      }

      if (
        order.user
          .toString() !==
        req.user._id
          .toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Bạn không có quyền hủy đơn này",
          });
      }

      if (
        order.status ===
        "Đã hủy"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Đơn hàng đã được hủy",
          });
      }

      if (
        order.status !==
        "Chờ xác nhận"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Đơn hàng đã được xử lý nên không thể tự hủy",
          });
      }

      if (
        (
          order.paymentStatus ||
          "Chưa thanh toán"
        ) ===
        "Đã thanh toán"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Đơn đã thanh toán. Vui lòng liên hệ cửa hàng.",
          });
      }

      await restoreOrderStock(
        order
      );

      order.status =
        "Đã hủy";

      await order.save();

      res.json({
        success: true,

        message:
          "Đã hủy đơn hàng và hoàn lại tồn kho",

        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Không thể hủy đơn hàng",
        });
    }
  }
);

// =====================================================
// CHI TIẾT ĐƠN
// =====================================================
router.get(
  "/:id",
  protect,
  async (
    req,
    res
  ) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        ).populate(
          "user",
          "name email"
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Không tìm thấy đơn hàng",
          });
      }

      const ownerId =
        order.user?._id
          ? order.user._id
              .toString()
          : order.user
              .toString();

      if (
        ownerId !==
          req.user._id
            .toString() &&
        req.user.role !==
          "admin"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Bạn không có quyền xem đơn hàng này",
          });
      }

      res.json({
        success: true,
        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,

          message:
            "Không thể lấy chi tiết đơn hàng",
        });
    }
  }
);

module.exports =
  router;