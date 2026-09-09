require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  {
    name: "Áo thun Basic đen",
    price: 199000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Đen", "Trắng"],
    description: "Áo thun Basic màu đen, thiết kế đơn giản, dễ phối đồ.",
    stock: 100,
  },

  {
    name: "Áo sơ mi trắng",
    price: 299000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1603252110481-7ba873bf42ab",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Trắng", "Đen"],
    description: "Áo sơ mi trắng thanh lịch, phù hợp đi học và đi làm.",
    stock: 100,
  },

  {
    name: "Quần jean xanh",
    price: 399000,
    category: "Quần",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d",
    sizes: ["28", "29", "30", "31", "32"],
    colors: ["Xanh", "Đen"],
    description: "Quần jean xanh trẻ trung, dễ phối với nhiều loại áo.",
    stock: 100,
  },

  {
    name: "Áo hoodie Basic",
    price: 449000,
    category: "Áo khoác",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7",
    sizes: ["M", "L", "XL"],
    colors: ["Đen", "Xám"],
    description: "Áo hoodie Basic phong cách trẻ trung, phù hợp thời tiết se lạnh.",
    stock: 100,
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Đã kết nối MongoDB");

    await Product.deleteMany();

    await Product.insertMany(products);

    console.log("✅ Đã thêm 4 sản phẩm vào MongoDB");

    await mongoose.disconnect();

    console.log("✅ Đã ngắt kết nối MongoDB");
  } catch (error) {
    console.error("❌ Seed database thất bại");
    console.error(error.message);
  }
};

seedDatabase();