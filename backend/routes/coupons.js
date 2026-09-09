const express = require("express");

const Coupon =
  require("../models/Coupon");

const {
  protect,
  adminOnly,
} = require("../middleware/auth");

const router =
  express.Router();

// =====================================================
// HÀM KIỂM TRA VOUCHER
// =====================================================
const validateCoupon = (
  coupon,
  subtotal
) => {
  const now =
    new Date();

  if (!coupon.active) {
    return {
      valid: false,
      message:
        "Mã giảm giá đã bị vô hiệu hóa",
    };
  }

  if (
    coupon.startDate &&
    now <
      new Date(
        coupon.startDate
      )
  ) {
    return {
      valid: false,
      message:
        "Mã giảm giá chưa đến thời gian sử dụng",
    };
  }

  if (
    coupon.endDate &&
    now >
      new Date(
        coupon.endDate
      )
  ) {
    return {
      valid: false,
      message:
        "Mã giảm giá đã hết hạn",
    };
  }

  if (
    coupon.usageLimit > 0 &&
    coupon.usedCount >=
      coupon.usageLimit
  ) {
    return {
      valid: false,
      message:
        "Mã giảm giá đã hết lượt sử dụng",
    };
  }

  if (
    Number(subtotal) <
    Number(
      coupon.minOrder || 0
    )
  ) {
    return {
      valid: false,
      message:
        `Đơn hàng phải từ ${Number(
          coupon.minOrder
        ).toLocaleString(
          "vi-VN"
        )} ₫ để sử dụng mã này`,
    };
  }

  return {
    valid: true,
  };
};

// =====================================================
// USER - KIỂM TRA / ÁP DỤNG MÃ GIẢM GIÁ
// POST /api/coupons/apply
// =====================================================
router.post(
  "/apply",
  protect,
  async (req, res) => {
    try {
      const {
        code,
        subtotal,
        shipping = 0,
      } = req.body;

      if (!code) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vui lòng nhập mã giảm giá",
          });
      }

      const orderSubtotal =
        Number(subtotal || 0);

      const orderShipping =
        Number(shipping || 0);

      const coupon =
        await Coupon.findOne({
          code:
            code
              .trim()
              .toUpperCase(),
        });

      if (!coupon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Mã giảm giá không tồn tại",
          });
      }

      const validation =
        validateCoupon(
          coupon,
          orderSubtotal
        );

      if (
        !validation.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              validation.message,
          });
      }

      let discount = 0;

      let shippingDiscount =
        0;

      // =========================================
      // GIẢM THEO %
      // =========================================
      if (
        coupon.type ===
        "PERCENT"
      ) {
        discount =
          orderSubtotal *
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

      // =========================================
      // GIẢM TIỀN CỐ ĐỊNH
      // =========================================
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
            orderSubtotal
          );
      }

      // =========================================
      // FREESHIP
      // =========================================
      if (
        coupon.type ===
        "FREESHIP"
      ) {
        shippingDiscount =
          orderShipping;
      }

      discount =
        Math.round(
          discount
        );

      shippingDiscount =
        Math.round(
          shippingDiscount
        );

      const total =
        Math.max(
          0,
          orderSubtotal +
            orderShipping -
            discount -
            shippingDiscount
        );

      res.json({
        success: true,

        message:
          "Áp dụng mã giảm giá thành công",

        coupon: {
          _id:
            coupon._id,

          code:
            coupon.code,

          name:
            coupon.name,

          type:
            coupon.type,

          value:
            coupon.value,

          minOrder:
            coupon.minOrder,

          maxDiscount:
            coupon.maxDiscount,
        },

        discount,

        shippingDiscount,

        total,
      });
    } catch (error) {
      console.error(
        "Apply coupon error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể áp dụng mã giảm giá",
        });
    }
  }
);

// =====================================================
// ADMIN - LẤY TẤT CẢ VOUCHER
// GET /api/coupons
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
      const coupons =
        await Coupon.find()
          .sort({
            createdAt: -1,
          });

      res.json({
        success: true,
        count:
          coupons.length,
        coupons,
      });
    } catch (error) {
      console.error(
        "Get coupons error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể tải mã giảm giá",
        });
    }
  }
);

// =====================================================
// ADMIN - THÊM VOUCHER
// POST /api/coupons
// =====================================================
router.post(
  "/",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const {
        code,
        name,
        type,
        value,
        minOrder,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        active,
      } = req.body;

      if (
        !code ||
        !name ||
        !type
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vui lòng nhập mã, tên và loại voucher",
          });
      }

      const allowedTypes = [
        "PERCENT",
        "FIXED",
        "FREESHIP",
      ];

      if (
        !allowedTypes.includes(
          type
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Loại voucher không hợp lệ",
          });
      }

      const normalizedCode =
        code
          .trim()
          .toUpperCase();

      const existing =
        await Coupon.findOne({
          code:
            normalizedCode,
        });

      if (existing) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Mã voucher đã tồn tại",
          });
      }

      const coupon =
        await Coupon.create({
          code:
            normalizedCode,

          name:
            name.trim(),

          type,

          value:
            type ===
            "FREESHIP"
              ? 0
              : Number(
                  value || 0
                ),

          minOrder:
            Number(
              minOrder || 0
            ),

          maxDiscount:
            Number(
              maxDiscount ||
                0
            ),

          startDate:
            startDate ||
            null,

          endDate:
            endDate ||
            null,

          usageLimit:
            Number(
              usageLimit ||
                0
            ),

          active:
            active !==
            false,
        });

      res
        .status(201)
        .json({
          success: true,
          message:
            "Đã tạo mã giảm giá",
          coupon,
        });
    } catch (error) {
      console.error(
        "Create coupon error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Không thể tạo mã giảm giá",
        });
    }
  }
);

// =====================================================
// ADMIN - SỬA VOUCHER
// PUT /api/coupons/:id
// =====================================================
router.put(
  "/:id",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const coupon =
        await Coupon.findById(
          req.params.id
        );

      if (!coupon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Không tìm thấy voucher",
          });
      }

      const {
        code,
        name,
        type,
        value,
        minOrder,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        active,
      } = req.body;

      if (code) {
        const normalizedCode =
          code
            .trim()
            .toUpperCase();

        const duplicate =
          await Coupon.findOne({
            code:
              normalizedCode,

            _id: {
              $ne:
                coupon._id,
            },
          });

        if (duplicate) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Mã voucher đã tồn tại",
            });
        }

        coupon.code =
          normalizedCode;
      }

      if (
        name !== undefined
      ) {
        coupon.name =
          name.trim();
      }

      if (
        type !== undefined
      ) {
        coupon.type =
          type;
      }

      if (
        value !== undefined
      ) {
        coupon.value =
          Number(value);
      }

      if (
        minOrder !== undefined
      ) {
        coupon.minOrder =
          Number(minOrder);
      }

      if (
        maxDiscount !==
        undefined
      ) {
        coupon.maxDiscount =
          Number(
            maxDiscount
          );
      }

      if (
        usageLimit !==
        undefined
      ) {
        coupon.usageLimit =
          Number(
            usageLimit
          );
      }

      if (
        active !== undefined
      ) {
        coupon.active =
          Boolean(active);
      }

      if (
        startDate !==
        undefined
      ) {
        coupon.startDate =
          startDate ||
          null;
      }

      if (
        endDate !==
        undefined
      ) {
        coupon.endDate =
          endDate ||
          null;
      }

      await coupon.save();

      res.json({
        success: true,
        message:
          "Đã cập nhật voucher",
        coupon,
      });
    } catch (error) {
      console.error(
        "Update coupon error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Không thể cập nhật voucher",
        });
    }
  }
);

// =====================================================
// ADMIN - XÓA VOUCHER
// DELETE /api/coupons/:id
// =====================================================
router.delete(
  "/:id",
  protect,
  adminOnly,
  async (
    req,
    res
  ) => {
    try {
      const coupon =
        await Coupon.findById(
          req.params.id
        );

      if (!coupon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Không tìm thấy voucher",
          });
      }

      await coupon.deleteOne();

      res.json({
        success: true,
        message:
          "Đã xóa voucher",
      });
    } catch (error) {
      console.error(
        "Delete coupon error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể xóa voucher",
        });
    }
  }
);

module.exports =
  router;