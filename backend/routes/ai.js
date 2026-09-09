const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// =====================================================
// 1. CHUẨN HÓA TIẾNG VIỆT
// =====================================================
function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

// =====================================================
// 2. ESCAPE REGEX
// =====================================================
function escapeRegExp(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =====================================================
// 3. KIỂM TRA TỪ / CỤM TỪ CHÍNH XÁC
//
// SỬA LỖI:
// "không" -> "khong"
// "hồng"  -> "hong"
//
// Code cũ:
// khong.includes("hong") = true
//
// Code mới:
// chỉ nhận "hong" khi nó là một từ độc lập.
// =====================================================
function containsExactPhrase(text, phrase) {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);

  const escaped = escapeRegExp(normalizedPhrase);

  const regex = new RegExp(
    `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
    "i"
  );

  return regex.test(normalizedText);
}

// =====================================================
// 4. ĐỊNH DẠNG GIÁ
// =====================================================
function formatPrice(price) {
  return Number(price || 0).toLocaleString("vi-VN") + " ₫";
}

// =====================================================
// 5. TÌM NGÂN SÁCH
//
// Hỗ trợ:
// 300000
// 300.000
// 300k
// 300 nghìn
// 1 triệu
// 1.5 triệu
// =====================================================
function extractBudget(message) {
  const raw = String(message || "");

  const text = normalizeText(raw).replace(/\s/g, "");

  // -----------------------------------------
  // 1 triệu, 1.5 triệu
  // -----------------------------------------
  const millionMatch = text.match(
    /(\d+(?:[.,]\d+)?)trieu/
  );

  if (millionMatch) {
    return Math.round(
      parseFloat(
        millionMatch[1].replace(",", ".")
      ) * 1000000
    );
  }

  // -----------------------------------------
  // 300k, 300 nghìn
  // -----------------------------------------
  const thousandMatch = text.match(
    /(\d+(?:[.,]\d+)?)(k|nghin|ngan)/
  );

  if (thousandMatch) {
    return Math.round(
      parseFloat(
        thousandMatch[1].replace(",", ".")
      ) * 1000
    );
  }

  // -----------------------------------------
  // 300000 hoặc 300.000
  // -----------------------------------------
  const numberMatches = raw.match(/\d[\d.,]*/g);

  if (
    numberMatches &&
    numberMatches.length > 0
  ) {
    const numbers = numberMatches
      .map((item) =>
        Number(
          item.replace(/[.,]/g, "")
        )
      )
      .filter((number) =>
        Number.isFinite(number)
      );

    // Không nhầm size 30 thành tiền
    const likelyBudget = numbers.find(
      (number) => number >= 10000
    );

    if (likelyBudget) {
      return likelyBudget;
    }
  }

  return null;
}

// =====================================================
// 6. TÌM DANH MỤC
// =====================================================
function extractCategory(message) {
  const text = normalizeText(message);

  // Áo khoác
  if (
    containsExactPhrase(text, "áo khoác") ||
    containsExactPhrase(text, "hoodie")
  ) {
    return "Áo khoác";
  }

  // Quần
  if (
    containsExactPhrase(text, "quần jean") ||
    containsExactPhrase(text, "jean") ||
    containsExactPhrase(text, "quần")
  ) {
    return "Quần";
  }

  // Áo
  if (
    containsExactPhrase(text, "áo sơ mi") ||
    containsExactPhrase(text, "sơ mi") ||
    containsExactPhrase(text, "áo thun") ||
    containsExactPhrase(text, "áo phông") ||
    containsExactPhrase(text, "t-shirt") ||
    containsExactPhrase(text, "tshirt") ||
    containsExactPhrase(text, "áo")
  ) {
    return "Áo";
  }

  return null;
}

// =====================================================
// 7. TÌM MÀU
// =====================================================
function extractColor(message, products) {
  const commonColors = [
    "đen",
    "trắng",
    "xanh",
    "xám",
    "đỏ",
    "vàng",
    "hồng",
    "nâu",
    "be",
    "tím",
    "cam",
  ];

  // Lấy thêm màu trong MongoDB
  const productColors = products
    .flatMap((product) => product.colors || [])
    .filter(Boolean);

  const allColors = [
    ...new Set([
      ...commonColors,
      ...productColors,
    ]),
  ];

  // QUAN TRỌNG:
  // Không dùng includes nữa.
  for (const color of allColors) {
    if (
      containsExactPhrase(
        message,
        color
      )
    ) {
      return color;
    }
  }

  return null;
}

// =====================================================
// 8. TÌM SIZE
// =====================================================
function extractSize(message, products) {
  const original = String(message || "").toUpperCase();

  const availableSizes = [
    ...new Set(
      products
        .flatMap(
          (product) => product.sizes || []
        )
        .map((size) =>
          String(size).toUpperCase()
        )
    ),
  ];

  // -----------------------------------------
  // Kiểm tra size có trong MongoDB
  // -----------------------------------------
  for (const size of availableSizes) {
    const escaped = escapeRegExp(size);

    const regex = new RegExp(
      `(^|\\s|[:,;])${escaped}(?=$|\\s|[.,!?;:])`,
      "i"
    );

    if (regex.test(original)) {
      return size;
    }
  }

  // -----------------------------------------
  // Size phổ biến
  // -----------------------------------------
  const sizeMatch = original.match(
    /\b(?:SIZE\s*)?(XXL|XL|L|M|S|XS|\d{2})\b/
  );

  return sizeMatch
    ? sizeMatch[1]
    : null;
}

// =====================================================
// 9. TÁCH BỘ LỌC TỪ CÂU HỎI
// =====================================================
function extractFilters(message, products) {
  return {
    budget: extractBudget(message),

    category: extractCategory(message),

    color: extractColor(
      message,
      products
    ),

    size: extractSize(
      message,
      products
    ),
  };
}

// =====================================================
// 10. KIỂM TRA NGƯỜI DÙNG MUỐN XÓA YÊU CẦU CŨ
// =====================================================
function wantsReset(message) {
  const text = normalizeText(message);

  return (
    containsExactPhrase(text, "tìm lại") ||
    containsExactPhrase(
      text,
      "bỏ qua yêu cầu trước"
    ) ||
    containsExactPhrase(
      text,
      "xóa bộ lọc"
    ) ||
    containsExactPhrase(
      text,
      "làm lại"
    ) ||
    containsExactPhrase(
      text,
      "tìm sản phẩm khác"
    )
  );
}

// =====================================================
// 11. GHI NHỚ HỘI THOẠI
// =====================================================
function buildConversationFilters(
  history,
  currentMessage,
  products
) {
  const filters = {
    budget: null,
    category: null,
    color: null,
    size: null,
  };

  // Nếu không yêu cầu reset
  // thì lấy điều kiện từ các câu trước
  if (!wantsReset(currentMessage)) {
    const safeHistory =
      Array.isArray(history)
        ? history
            .filter(
              (item) =>
                item &&
                item.role === "user" &&
                typeof item.content ===
                  "string"
            )
            .slice(-8)
        : [];

    for (const item of safeHistory) {
      const oldFilters =
        extractFilters(
          item.content,
          products
        );

      if (oldFilters.budget !== null) {
        filters.budget =
          oldFilters.budget;
      }

      if (oldFilters.category !== null) {
        filters.category =
          oldFilters.category;
      }

      if (oldFilters.color !== null) {
        filters.color =
          oldFilters.color;
      }

      if (oldFilters.size !== null) {
        filters.size =
          oldFilters.size;
      }
    }
  }

  // -----------------------------------------
  // ĐIỀU KIỆN CÂU HIỆN TẠI
  // luôn được ưu tiên
  // -----------------------------------------

  const currentFilters =
    extractFilters(
      currentMessage,
      products
    );

  if (
    currentFilters.budget !== null
  ) {
    filters.budget =
      currentFilters.budget;
  }

  if (
    currentFilters.category !== null
  ) {
    filters.category =
      currentFilters.category;
  }

  if (
    currentFilters.color !== null
  ) {
    filters.color =
      currentFilters.color;
  }

  if (
    currentFilters.size !== null
  ) {
    filters.size =
      currentFilters.size;
  }

  return filters;
}

// =====================================================
// 12. KIỂM TRA DANH MỤC SẢN PHẨM
// =====================================================
function productMatchesCategory(
  product,
  category
) {
  if (!category) {
    return true;
  }

  const productCategory =
    normalizeText(
      product.category
    );

  const productName =
    normalizeText(
      product.name
    );

  // -----------------------------------------
  // ÁO KHOÁC
  // -----------------------------------------
  if (category === "Áo khoác") {
    return (
      containsExactPhrase(
        productCategory,
        "ao khoac"
      ) ||
      containsExactPhrase(
        productName,
        "ao khoac"
      ) ||
      containsExactPhrase(
        productName,
        "hoodie"
      )
    );
  }

  // -----------------------------------------
  // QUẦN
  // -----------------------------------------
  if (category === "Quần") {
    return (
      containsExactPhrase(
        productCategory,
        "quan"
      ) ||
      containsExactPhrase(
        productName,
        "quan"
      ) ||
      containsExactPhrase(
        productName,
        "jean"
      )
    );
  }

  // -----------------------------------------
  // ÁO
  // -----------------------------------------
  if (category === "Áo") {
    const isNormalShirt =
      containsExactPhrase(
        productCategory,
        "ao"
      ) ||
      containsExactPhrase(
        productName,
        "ao"
      );

    const isJacket =
      containsExactPhrase(
        productCategory,
        "ao khoac"
      ) ||
      containsExactPhrase(
        productName,
        "hoodie"
      );

    return (
      isNormalShirt &&
      !isJacket
    );
  }

  return true;
}

// =====================================================
// 13. MÔ TẢ ĐIỀU KIỆN
// =====================================================
function buildFilterSummary(filters) {
  const parts = [];

  if (filters.category) {
    parts.push(
      `loại ${filters.category}`
    );
  }

  if (filters.color) {
    parts.push(
      `màu ${filters.color}`
    );
  }

  if (filters.size) {
    parts.push(
      `size ${filters.size}`
    );
  }

  if (filters.budget) {
    parts.push(
      `giá không quá ${formatPrice(
        filters.budget
      )}`
    );
  }

  return parts.join(", ");
}

// =====================================================
// 14. TẠO CÂU TRẢ LỜI
// =====================================================
function createRecommendationText(
  products,
  filters,
  remembered
) {
  const summary =
    buildFilterSummary(filters);

  // -----------------------------------------
  // Không tìm thấy sản phẩm
  // -----------------------------------------
  if (products.length === 0) {
    let response =
      "Hiện cửa hàng chưa có sản phẩm phù hợp";

    if (summary) {
      response +=
        ` với yêu cầu: ${summary}`;
    }

    response +=
      ". Bạn có thể thử tăng ngân sách, đổi màu, đổi size hoặc tìm sản phẩm khác nhé.";

    return response;
  }

  let response = "";

  // -----------------------------------------
  // Đang dùng điều kiện câu trước
  // -----------------------------------------
  if (remembered) {
    response +=
      "Mình đã ghi nhớ yêu cầu trước của bạn và tiếp tục lọc sản phẩm.\n\n";
  }

  if (summary) {
    response +=
      `Điều kiện đang tìm: ${summary}\n\n`;
  }

  response +=
    "Mình tìm được sản phẩm phù hợp:\n\n";

  products
    .slice(0, 3)
    .forEach(
      (product, index) => {
        response +=
          `${index + 1}. ${product.name}\n`;

        response +=
          `💰 Giá: ${formatPrice(
            product.price
          )}\n`;

        if (
          product.colors &&
          product.colors.length
        ) {
          response +=
            `🎨 Màu: ${product.colors.join(
              ", "
            )}\n`;
        }

        if (
          product.sizes &&
          product.sizes.length
        ) {
          response +=
            `📏 Size: ${product.sizes.join(
              ", "
            )}\n`;
        }

        if (
          typeof product.stock ===
          "number"
        ) {
          response +=
            `📦 Tồn kho: ${product.stock}\n`;
        }

        response += "\n";
      }
    );

  response +=
    'Bạn có thể bấm "Xem sản phẩm" để xem sản phẩm trên cửa hàng.';

  return response;
}

// =====================================================
// 15. CÂU TRẢ LỜI CHUNG
// =====================================================
function createGeneralReply(
  message,
  products
) {
  const text =
    normalizeText(message);

  // -----------------------------------------
  // CHÀO HỎI
  // -----------------------------------------
  if (
    containsExactPhrase(
      text,
      "xin chao"
    ) ||
    text === "chao" ||
    text === "hi" ||
    containsExactPhrase(
      text,
      "hello"
    )
  ) {
    return (
      "Xin chào 👋 " +
      "Mình là trợ lý tư vấn thời trang miễn phí của ClothStore. " +
      "Bạn có thể tìm sản phẩm theo loại, màu, size hoặc ngân sách."
    );
  }

  // -----------------------------------------
  // CẢM ƠN
  // -----------------------------------------
  if (
    containsExactPhrase(
      text,
      "cam on"
    ) ||
    containsExactPhrase(
      text,
      "thank"
    )
  ) {
    return (
      "Không có gì 😊 " +
      "Bạn cứ tiếp tục hỏi, mình sẽ hỗ trợ tìm sản phẩm phù hợp."
    );
  }

  // -----------------------------------------
  // SỐ LƯỢNG SẢN PHẨM
  // -----------------------------------------
  if (
    text.includes(
      "bao nhieu san pham"
    )
  ) {
    return (
      `Hiện cửa hàng có ${products.length} sản phẩm trong hệ thống.`
    );
  }

  return (
    "Mình có thể tìm sản phẩm theo loại quần áo, màu, size và ngân sách.\n\n" +
    'Ví dụ: "Tôi muốn áo đen dưới 300.000đ".'
  );
}

// =====================================================
// 16. KIỂM TRA CÂU HỎI CHUNG
// =====================================================
function isGeneralQuestion(message) {
  const text =
    normalizeText(message);

  return (
    containsExactPhrase(
      text,
      "xin chao"
    ) ||
    text === "chao" ||
    text === "hi" ||
    containsExactPhrase(
      text,
      "hello"
    ) ||
    containsExactPhrase(
      text,
      "cam on"
    ) ||
    containsExactPhrase(
      text,
      "thank"
    ) ||
    text.includes(
      "bao nhieu san pham"
    )
  );
}

// =====================================================
// 17. API CHATBOT
// =====================================================
router.post(
  "/chat",
  async (req, res) => {
    try {
      const {
        message,
        history = [],
      } = req.body;

      // -----------------------------------------
      // KIỂM TRA CÂU HỎI
      // -----------------------------------------
      if (
        !message ||
        !String(message).trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Vui lòng nhập câu hỏi.",
          });
      }

      // -----------------------------------------
      // LẤY SẢN PHẨM MONGODB
      // -----------------------------------------
      const products =
        await Product.find({})
          .select(
            "name price category image sizes colors description stock"
          )
          .lean();

      if (
        products.length === 0
      ) {
        return res.json({
          success: true,

          mode:
            "free-local-memory",

          products: [],

          message:
            "Hiện cửa hàng chưa có sản phẩm để tư vấn.",
        });
      }

      // -----------------------------------------
      // CÂU HỎI CHUNG
      // -----------------------------------------
      if (
        isGeneralQuestion(
          message
        )
      ) {
        return res.json({
          success: true,

          mode:
            "free-local-memory",

          products: [],

          message:
            createGeneralReply(
              message,
              products
            ),
        });
      }

      // -----------------------------------------
      // BỘ LỌC CÂU HIỆN TẠI
      // -----------------------------------------
      const currentFilters =
        extractFilters(
          message,
          products
        );

      // -----------------------------------------
      // BỘ LỌC KẾT HỢP HISTORY
      // -----------------------------------------
      const filters =
        buildConversationFilters(
          history,
          message,
          products
        );

      // -----------------------------------------
      // KIỂM TRA CÓ ĐIỀU KIỆN KHÔNG
      // -----------------------------------------
      const hasAnyFilter =
        filters.budget !== null ||
        filters.category !== null ||
        filters.color !== null ||
        filters.size !== null;

      if (!hasAnyFilter) {
        return res.json({
          success: true,

          mode:
            "free-local-memory",

          products: [],

          message:
            createGeneralReply(
              message,
              products
            ),
        });
      }

      // -----------------------------------------
      // KIỂM TRA CÓ DÙNG HISTORY KHÔNG
      // -----------------------------------------
      const currentFilterCount = [
        currentFilters.budget,
        currentFilters.category,
        currentFilters.color,
        currentFilters.size,
      ].filter(
        (value) =>
          value !== null
      ).length;

      const finalFilterCount = [
        filters.budget,
        filters.category,
        filters.color,
        filters.size,
      ].filter(
        (value) =>
          value !== null
      ).length;

      const remembered =
        Array.isArray(history) &&
        history.length > 0 &&
        finalFilterCount >
          currentFilterCount &&
        !wantsReset(message);

      // =================================================
      // 18. LỌC SẢN PHẨM
      // =================================================
      let matchedProducts =
        products.filter(
          (product) => {
            // -------------------------------------
            // HẾT HÀNG
            // -------------------------------------
            if (
              product.stock !==
                undefined &&
              Number(
                product.stock
              ) <= 0
            ) {
              return false;
            }

            // -------------------------------------
            // GIÁ
            // -------------------------------------
            if (
              filters.budget !==
                null &&
              Number(
                product.price
              ) >
                filters.budget
            ) {
              return false;
            }

            // -------------------------------------
            // DANH MỤC
            // -------------------------------------
            if (
              !productMatchesCategory(
                product,
                filters.category
              )
            ) {
              return false;
            }

            // -------------------------------------
            // MÀU
            // -------------------------------------
            if (
              filters.color
            ) {
              const hasColor =
                (
                  product.colors ||
                  []
                ).some(
                  (item) =>
                    normalizeText(
                      item
                    ) ===
                    normalizeText(
                      filters.color
                    )
                );

              if (!hasColor) {
                return false;
              }
            }

            // -------------------------------------
            // SIZE
            // -------------------------------------
            if (
              filters.size
            ) {
              const hasSize =
                (
                  product.sizes ||
                  []
                ).some(
                  (item) =>
                    String(
                      item
                    ).toUpperCase() ===
                    String(
                      filters.size
                    ).toUpperCase()
                );

              if (!hasSize) {
                return false;
              }
            }

            return true;
          }
        );

      // -----------------------------------------
      // SẮP XẾP GIÁ TĂNG DẦN
      // -----------------------------------------
      matchedProducts =
        matchedProducts.sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        );

      // -----------------------------------------
      // TRẢ KẾT QUẢ
      // -----------------------------------------
      return res.json({
        success: true,

        mode:
          "free-local-memory",

        remembered,

        filters,

        products:
          matchedProducts.slice(
            0,
            3
          ),

        message:
          createRecommendationText(
            matchedProducts,
            filters,
            remembered
          ),
      });
    } catch (error) {
      console.error(
        "❌ AI chat miễn phí bị lỗi:"
      );

      console.error(error);

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Không thể tư vấn lúc này. Vui lòng kiểm tra MongoDB và thử lại.",
        });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================
module.exports = router;