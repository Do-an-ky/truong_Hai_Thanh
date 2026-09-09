const express = require("express");

const User = require("../models/User");
const Order = require("../models/Order");

const {
  protect,
  adminOnly,
} = require("../middleware/auth");

const router = express.Router();

// =====================================================
// ADMIN - LẤY DANH SÁCH KHÁCH HÀNG
// GET /api/users/admin/all
// =====================================================
router.get(
  "/admin/all",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      // =================================================
      // LẤY USER
      // Không trả password về frontend
      // =================================================
      const users = await User.find()
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .lean();

      // =================================================
      // THỐNG KÊ ĐƠN HÀNG THEO USER
      // =================================================
      const orderStats =
        await Order.aggregate([
          {
            $group: {
              _id: "$user",

              // Tổng số đơn
              orderCount: {
                $sum: 1,
              },

              // Đơn đã giao
              deliveredCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "Đã giao",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              // Tổng tiền khách đã mua thành công
              totalSpent: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "Đã giao",
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
            },
          },
        ]);

      // =================================================
      // CHUYỂN THỐNG KÊ THÀNH MAP
      // =================================================
      const statsMap = {};

      orderStats.forEach((stat) => {
        statsMap[
          stat._id.toString()
        ] = {
          orderCount:
            stat.orderCount || 0,

          deliveredCount:
            stat.deliveredCount || 0,

          totalSpent:
            stat.totalSpent || 0,
        };
      });

      // =================================================
      // GHÉP USER + THỐNG KÊ
      // =================================================
      const result = users.map(
        (user) => {
          const stats =
            statsMap[
              user._id.toString()
            ] || {
              orderCount: 0,
              deliveredCount: 0,
              totalSpent: 0,
            };

          return {
            ...user,

            orderCount:
              stats.orderCount,

            deliveredCount:
              stats.deliveredCount,

            totalSpent:
              stats.totalSpent,
          };
        }
      );

      res.json({
        success: true,

        count:
          result.length,

        users:
          result,
      });
    } catch (error) {
      console.error(
        "Admin get users error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Không thể lấy danh sách khách hàng",
      });
    }
  }
);

// =====================================================
// ADMIN - THAY ĐỔI QUYỀN USER
// PUT /api/users/:id/role
// =====================================================
router.put(
  "/:id/role",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        role,
      } = req.body;

      // =================================================
      // CHỈ CHẤP NHẬN USER / ADMIN
      // =================================================
      if (
        ![
          "user",
          "admin",
        ].includes(role)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Quyền tài khoản không hợp lệ",
          });
      }

      // =================================================
      // KHÔNG CHO ADMIN TỰ HẠ QUYỀN
      // =================================================
      if (
        req.params.id ===
          req.user._id.toString() &&
        role !== "admin"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Bạn không thể tự hạ quyền tài khoản Admin đang đăng nhập",
          });
      }

      // =================================================
      // TÌM USER
      // =================================================
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Không tìm thấy tài khoản",
          });
      }

      // =================================================
      // CẬP NHẬT ROLE
      // =================================================
      user.role = role;

      await user.save();

      res.json({
        success: true,

        message:
          "Đã cập nhật quyền tài khoản",

        user: {
          _id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          createdAt:
            user.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Update user role error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Không thể cập nhật quyền tài khoản",
      });
    }
  }
);

module.exports = router;