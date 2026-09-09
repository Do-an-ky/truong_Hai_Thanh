const express = require("express");

const Product =
  require("../models/Product");

const {
  protect,
  adminOnly,
} = require("../middleware/auth");

const router =
  express.Router();

// =====================================================
// GET TẤT CẢ SẢN PHẨM
// KHÔNG LIMIT 10
// =====================================================
router.get(
  "/",
  async (req, res) => {
    try {
      const products =
        await Product.find()
          .sort({
            createdAt: -1,
          });

      res.json({
        success: true,

        count:
          products.length,

        products,
      });
    } catch (error) {
      console.error(
        "Get products error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể tải danh sách sản phẩm",
        });
    }
  }
);

// =====================================================
// GET CHI TIẾT
// =====================================================
router.get(
  "/:id",
  async (req, res) => {
    try {
      const product =
        await Product.findById(
          req.params.id
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

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể tải sản phẩm",
        });
    }
  }
);

// =====================================================
// ADMIN - THÊM
// =====================================================
router.post(
  "/",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const product =
        await Product.create(
          req.body
        );

      res
        .status(201)
        .json({
          success: true,
          message:
            "Thêm sản phẩm thành công",
          product,
        });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);

// =====================================================
// ADMIN - SỬA
// =====================================================
router.put(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const product =
        await Product.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
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

      res.json({
        success: true,
        message:
          "Cập nhật sản phẩm thành công",
        product,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);

// =====================================================
// ADMIN - XÓA
// =====================================================
router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const product =
        await Product.findByIdAndDelete(
          req.params.id
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

      res.json({
        success: true,
        message:
          "Xóa sản phẩm thành công",
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể xóa sản phẩm",
        });
    }
  }
);

module.exports =
  router;