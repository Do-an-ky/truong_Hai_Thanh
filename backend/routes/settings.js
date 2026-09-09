const express = require("express");

const SiteSetting =
  require("../models/SiteSetting");

const {
  protect,
  adminOnly,
} = require("../middleware/auth");

const router = express.Router();

const getMainSetting = async () => {
  let setting =
    await SiteSetting.findOne({
      key: "main",
    });

  if (!setting) {
    setting =
      await SiteSetting.create({
        key: "main",
      });
  }

  return setting;
};

// =====================================================
// PUBLIC
// GET /api/settings/public
// =====================================================
router.get(
  "/public",
  async (req, res) => {
    try {
      const setting =
        await getMainSetting();

      res.json({
        success: true,

        maintenance: {
          enabled:
            Boolean(
              setting
                .maintenance
                ?.enabled
            ),

          title:
            setting
              .maintenance
              ?.title ||
            "Hệ thống đang bảo trì",

          message:
            setting
              .maintenance
              ?.message ||
            "ClothStore đang được nâng cấp. Vui lòng quay lại sau.",

          estimatedEnd:
            setting
              .maintenance
              ?.estimatedEnd ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "Public settings error:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể tải trạng thái website",
        });
    }
  }
);

// =====================================================
// ADMIN
// GET /api/settings/admin
// =====================================================
router.get(
  "/admin",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const setting =
        await getMainSetting();

      res.json({
        success: true,
        maintenance:
          setting.maintenance,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message:
            "Không thể tải cài đặt bảo trì",
        });
    }
  }
);

// =====================================================
// ADMIN - BẬT/TẮT BẢO TRÌ
// PUT /api/settings/maintenance
// =====================================================
router.put(
  "/maintenance",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        enabled,
        title,
        message,
        estimatedEnd,
      } = req.body;

      const setting =
        await getMainSetting();

      setting.maintenance = {
        enabled:
          Boolean(enabled),

        title:
          String(
            title ||
              "Hệ thống đang bảo trì"
          ).trim(),

        message:
          String(
            message ||
              "ClothStore đang được nâng cấp. Vui lòng quay lại sau."
          ).trim(),

        estimatedEnd:
          estimatedEnd
            ? new Date(
                estimatedEnd
              )
            : null,

        updatedBy:
          req.user._id,
      };

      await setting.save();

      res.json({
        success: true,

        message:
          setting
            .maintenance
            .enabled
            ? "Đã bật chế độ bảo trì"
            : "Đã tắt chế độ bảo trì",

        maintenance:
          setting.maintenance,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Không thể cập nhật chế độ bảo trì",
        });
    }
  }
);

module.exports = router;