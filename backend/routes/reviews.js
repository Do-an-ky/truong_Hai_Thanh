const express = require("express");
const mongoose = require("mongoose");

const Review = require("../models/Review");
const Product = require("../models/Product");

const {
  protect,
} = require("../middleware/auth");

const router = express.Router();

// =====================================================
// GET /api/reviews/product/:productId
// Lấy đánh giá của một sản phẩm
// Không cần đăng nhập
// =====================================================

router.get(
  "/product/:productId",
  async (req, res) => {
    try {
      const { productId } = req.params;

      // Kiểm tra ID sản phẩm
      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mã sản phẩm không hợp lệ.",
        });
      }

      // Lấy danh sách đánh giá
      const reviews = await Review.find({
        product: productId,
      })
        .populate("user", "name")
        .sort({
          updatedAt: -1,
        })
        .lean();

      const reviewCount = reviews.length;

      // Tính điểm trung bình
      const averageRating =
        reviewCount === 0
          ? 0
          : reviews.reduce(
              (sum, review) =>
                sum +
                Number(
                  review.rating || 0
                ),
              0
            ) / reviewCount;

      return res.json({
        success: true,

        reviewCount,

        averageRating: Number(
          averageRating.toFixed(1)
        ),

        reviews,
      });
    } catch (error) {
      console.error(
        "GET REVIEWS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Không thể tải đánh giá sản phẩm.",
      });
    }
  }
);

// =====================================================
// POST /api/reviews/product/:productId
// Thêm hoặc cập nhật đánh giá
// Phải đăng nhập
// =====================================================

router.post(
  "/product/:productId",
  protect,
  async (req, res) => {
    try {
      const { productId } = req.params;

      const rating = Number(
        req.body.rating
      );

      const comment = String(
        req.body.comment || ""
      ).trim();

      // Kiểm tra ID
      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mã sản phẩm không hợp lệ.",
        });
      }

      // Kiểm tra số sao
      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Số sao phải là số nguyên từ 1 đến 5.",
        });
      }

      // Kiểm tra bình luận
      if (!comment) {
        return res.status(400).json({
          success: false,
          message:
            "Vui lòng nhập nhận xét.",
        });
      }

      if (comment.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Nhận xét không được vượt quá 1000 ký tự.",
        });
      }

      // Kiểm tra sản phẩm tồn tại
      const product =
        await Product.findById(
          productId
        ).select("_id");

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy sản phẩm.",
        });
      }

      // Kiểm tra người dùng đã đánh giá chưa
      const existingReview =
        await Review.findOne({
          product: productId,
          user: req.user._id,
        });

      let review;
      let message;

      // Nếu đã đánh giá -> cập nhật
      if (existingReview) {
        existingReview.rating = rating;
        existingReview.comment = comment;

        review =
          await existingReview.save();

        message =
          "Đã cập nhật đánh giá của bạn.";
      } else {
        // Nếu chưa -> tạo mới
        review = await Review.create({
          product: productId,
          user: req.user._id,
          rating,
          comment,
        });

        message =
          "Cảm ơn bạn đã đánh giá sản phẩm.";
      }

      // Lấy tên người đánh giá
      await review.populate(
        "user",
        "name"
      );

      return res
        .status(
          existingReview ? 200 : 201
        )
        .json({
          success: true,
          message,
          review,
        });
    } catch (error) {
      console.error(
        "SAVE REVIEW ERROR:",
        error
      );

      // Trường hợp trùng đánh giá
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Bạn đã đánh giá sản phẩm này.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Không thể lưu đánh giá.",
      });
    }
  }
);

module.exports = router;