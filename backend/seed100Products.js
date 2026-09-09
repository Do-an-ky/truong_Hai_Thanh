require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/clothstore";

// =====================================================
// ẢNH SẢN PHẨM
// =====================================================
const IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
  "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=900",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?w=900",
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900",
  "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=900",
  "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900",
  "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=900",
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900",
  "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=900",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900",
  "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=900",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900",
  "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=900",
  "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=900",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900",
  "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=900",
];

// =====================================================
// DANH SÁCH SẢN PHẨM
// 5 DANH MỤC x 20 = 100 SẢN PHẨM
// =====================================================
const templates = [
  {
    category: "Áo",

    names: [
      "Áo thun Basic",
      "Áo thun Oversize",
      "Áo thun Graphic",
      "Áo polo Classic",
      "Áo polo Premium",
      "Áo sơ mi Oxford",
      "Áo sơ mi Linen",
      "Áo sơ mi Form rộng",
      "Áo len cổ tròn",
      "Áo len cổ tim",
      "Áo cardigan",
      "Áo croptop",
      "Áo kiểu thanh lịch",
      "Áo dài tay Basic",
      "Áo tanktop",
      "Áo sweater",
      "Áo nỉ cổ tròn",
      "Áo cổ lọ",
      "Áo blouse",
      "Áo denim shirt",
    ],

    sizes: ["S", "M", "L", "XL"],

    colors: [
      "Đen",
      "Trắng",
      "Xám",
      "Xanh navy",
      "Be",
    ],

    basePrice: 199000,
  },

  {
    category: "Quần",

    names: [
      "Quần jean Slim",
      "Quần jean Straight",
      "Quần jean Baggy",
      "Quần kaki Basic",
      "Quần kaki Công sở",
      "Quần tây Slim",
      "Quần tây Form rộng",
      "Quần jogger",
      "Quần cargo",
      "Quần short jean",
      "Quần short kaki",
      "Quần short thể thao",
      "Quần ống rộng",
      "Quần culottes",
      "Quần legging",
      "Quần nỉ",
      "Quần linen",
      "Quần chinos",
      "Quần denim đen",
      "Quần thể thao",
    ],

    sizes: [
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
    ],

    colors: [
      "Đen",
      "Xanh",
      "Be",
      "Xám",
      "Nâu",
    ],

    basePrice: 329000,
  },

  {
    category: "Áo khoác",

    names: [
      "Áo hoodie Basic",
      "Áo hoodie Zip",
      "Áo khoác Denim",
      "Áo khoác Bomber",
      "Áo khoác Varsity",
      "Áo khoác Gió",
      "Áo khoác Kaki",
      "Áo khoác Nỉ",
      "Áo khoác Dù",
      "Áo blazer Basic",
      "Áo blazer Oversize",
      "Áo cardigan Dày",
      "Áo khoác Puffer",
      "Áo khoác Harrington",
      "Áo khoác Trucker",
      "Áo khoác Field",
      "Áo khoác Workwear",
      "Áo khoác Parka",
      "Áo khoác Coach",
      "Áo khoác Lightweight",
    ],

    sizes: ["S", "M", "L", "XL"],

    colors: [
      "Đen",
      "Xám",
      "Xanh navy",
      "Nâu",
      "Be",
    ],

    basePrice: 449000,
  },

  {
    category: "Váy",

    names: [
      "Váy dáng suông",
      "Váy chữ A",
      "Váy midi",
      "Váy maxi",
      "Váy sơ mi",
      "Váy body",
      "Váy hoa nhí",
      "Váy hai dây",
      "Váy công sở",
      "Váy xếp ly",
      "Chân váy chữ A",
      "Chân váy midi",
      "Chân váy jean",
      "Chân váy xếp ly",
      "Chân váy tennis",
      "Chân váy dài",
      "Váy cổ vuông",
      "Váy babydoll",
      "Váy tay bồng",
      "Váy linen",
    ],

    sizes: ["S", "M", "L"],

    colors: [
      "Đen",
      "Trắng",
      "Kem",
      "Hồng",
      "Nâu",
    ],

    basePrice: 359000,
  },

  {
    category: "Phụ kiện",

    names: [
      "Mũ lưỡi trai",
      "Mũ bucket",
      "Túi tote",
      "Túi đeo chéo",
      "Túi mini",
      "Thắt lưng Basic",
      "Ví da Basic",
      "Khăn choàng",
      "Vớ cổ cao",
      "Vớ cổ ngắn",
      "Kính thời trang",
      "Dây chuyền Basic",
      "Vòng tay Basic",
      "Nhẫn thời trang",
      "Băng đô",
      "Kẹp tóc",
      "Scrunchie",
      "Túi canvas",
      "Mũ len",
      "Khăn bandana",
    ],

    sizes: ["Freesize"],

    colors: [
      "Đen",
      "Trắng",
      "Be",
      "Nâu",
      "Xám",
    ],

    basePrice: 99000,
  },
];

// =====================================================
// MÔ TẢ
// =====================================================
const descriptions = [
  "Thiết kế hiện đại, dễ phối đồ và phù hợp sử dụng hằng ngày.",

  "Chất liệu thoải mái, form đẹp và phong cách trẻ trung.",

  "Sản phẩm phù hợp nhiều phong cách, dễ kết hợp cùng các item khác.",

  "Kiểu dáng tối giản, hiện đại, phù hợp đi học, đi chơi hoặc đi làm.",

  "Thiết kế mới của ClothStore với form mặc thoải mái và dễ phối.",
];

// =====================================================
// TẠO 100 SẢN PHẨM
// =====================================================
const buildProducts = () => {
  const products = [];

  let index = 0;

  for (const template of templates) {
    for (
      let i = 0;
      i < template.names.length;
      i++
    ) {
      const suffixes = [
        "Đen",
        "Trắng",
        "Xanh",
        "Be",
        "Xám",
      ];

      const product = {
        name:
          `${template.names[i]} ${suffixes[i % suffixes.length]}`,

        price:
          template.basePrice +
          (i % 7) * 30000,

        category:
          template.category,

        image:
          IMAGES[
            index %
              IMAGES.length
          ],

        sizes:
          template.sizes,

        colors:
          template.colors,

        description:
          descriptions[
            index %
              descriptions.length
          ],

        // =============================================
        // MỖI SẢN PHẨM CÓ 50 HÀNG
        // =============================================
        stock: 50,
      };

      products.push(product);

      index++;
    }
  }

  return products.slice(
    0,
    100
  );
};

// =====================================================
// CHẠY SEED
// =====================================================
const run = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(
      MONGODB_URI
    );

    console.log(
      "✅ Đã kết nối MongoDB"
    );

    const products =
      buildProducts();

    console.log(
      `📦 Chuẩn bị tạo ${products.length} sản phẩm...`
    );

    // ===============================================
    // THÊM / CẬP NHẬT 100 SẢN PHẨM
    // ===============================================
    for (
      const product
      of products
    ) {
      await Product.findOneAndUpdate(
        {
          name:
            product.name,
        },

        {
          $set:
            product,
        },

        {
          upsert: true,
          new: true,
          setDefaultsOnInsert:
            true,
        }
      );
    }

    // ===============================================
    // ĐƯA TOÀN BỘ TỒN KHO VỀ 50
    // ===============================================
    await Product.updateMany(
      {},

      {
        $set: {
          stock: 50,
        },
      }
    );

    const total =
      await Product.countDocuments();

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "✅ TẠO SẢN PHẨM THÀNH CÔNG"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `📦 Đã đồng bộ: ${products.length} sản phẩm`
    );

    console.log(
      "📊 Tồn kho mỗi sản phẩm: 50"
    );

    console.log(
      `🗃️ Tổng sản phẩm trong MongoDB: ${total}`
    );

    console.log(
      "=========================================="
    );
  } catch (error) {
    console.error(
      "❌ Lỗi tạo sản phẩm:"
    );

    console.error(
      error
    );
  } finally {
    await mongoose.disconnect();

    process.exit();
  }
};

run();