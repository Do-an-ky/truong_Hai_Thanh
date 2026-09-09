const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: "main",
    },

    maintenance: {
      enabled: {
        type: Boolean,
        default: false,
      },

      title: {
        type: String,
        default: "Hệ thống đang bảo trì",
        trim: true,
      },

      message: {
        type: String,
        default:
          "ClothStore đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.",
        trim: true,
      },

      estimatedEnd: {
        type: Date,
        default: null,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    "SiteSetting",
    siteSettingSchema
  );