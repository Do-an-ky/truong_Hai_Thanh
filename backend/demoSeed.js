require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");
const Coupon = require("./models/Coupon");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/clothstore";

const productsData = [
  {
    name: "Áo thun Basic đen",
    price: 199000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Đen", "Trắng"],
    description:
      "Áo thun basic dễ phối đồ, phù hợp mặc hằng ngày.",
    stock: 42,
  },
  {
    name: "Áo sơ mi trắng",
    price: 299000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=900",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Trắng", "Đen"],
    description:
      "Áo sơ mi phong cách tối giản, phù hợp đi học và đi làm.",
    stock: 30,
  },
  {
    name: "Quần jean xanh",
    price: 399000,
    category: "Quần",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=900",
    sizes: ["28", "29", "30", "31", "32"],
    colors: ["Xanh", "Đen"],
    description:
      "Quần jean form trẻ trung, chất liệu bền và dễ phối.",
    stock: 25,
  },
  {
    name: "Áo hoodie Basic",
    price: 449000,
    category: "Áo khoác",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900",
    sizes: ["M", "L", "XL"],
    colors: ["Đen", "Xám"],
    description:
      "Hoodie basic ấm áp, phù hợp phong cách năng động.",
    stock: 18,
  },
  {
    name: "Áo polo xanh navy",
    price: 329000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=900",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Xanh navy", "Trắng"],
    description:
      "Áo polo lịch sự nhưng vẫn trẻ trung.",
    stock: 35,
  },
  {
    name: "Quần kaki be",
    price: 369000,
    category: "Quần",
    image:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900",
    sizes: ["28", "29", "30", "31", "32"],
    colors: ["Be", "Đen"],
    description:
      "Quần kaki nhẹ, phù hợp nhiều phong cách.",
    stock: 22,
  },
  {
    name: "Áo khoác denim",
    price: 599000,
    category: "Áo khoác",
    image:
      "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=900",
    sizes: ["M", "L", "XL"],
    colors: ["Xanh", "Đen"],
    description:
      "Áo khoác denim cá tính, phù hợp đi chơi.",
    stock: 14,
  },
  {
    name: "Váy nữ dáng suông",
    price: 429000,
    category: "Váy",
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900",
    sizes: ["S", "M", "L"],
    colors: ["Đen", "Kem"],
    description:
      "Váy dáng suông thanh lịch, dễ mặc.",
    stock: 20,
  },
  {
    name: "Chân váy chữ A",
    price: 319000,
    category: "Váy",
    image:
      "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=900",
    sizes: ["S", "M", "L"],
    colors: ["Đen", "Nâu"],
    description:
      "Chân váy chữ A phong cách trẻ trung.",
    stock: 27,
  },
  {
    name: "Áo len cổ tròn",
    price: 389000,
    category: "Áo",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900",
    sizes: ["M", "L", "XL"],
    colors: ["Kem", "Xám"],
    description:
      "Áo len mềm, phù hợp thời tiết se lạnh.",
    stock: 16,
  },
];

const couponsData = [
  {
    code: "SALE10",
    name: "Giảm 10% toàn shop",
    type: "PERCENT",
    value: 10,
    minOrder: 200000,
    maxDiscount: 50000,
    usageLimit: 100,
    usedCount: 6,
    active: true,
  },
  {
    code: "GIAM50K",
    name: "Giảm trực tiếp 50.000đ",
    type: "FIXED",
    value: 50000,
    minOrder: 500000,
    maxDiscount: 0,
    usageLimit: 50,
    usedCount: 3,
    active: true,
  },
  {
    code: "FREESHIP",
    name: "Miễn phí vận chuyển",
    type: "FREESHIP",
    value: 0,
    minOrder: 300000,
    maxDiscount: 0,
    usageLimit: 100,
    usedCount: 8,
    active: true,
  },
];

const ensureUser = async ({
  name,
  email,
  password,
  role,
}) => {
  let user =
    await User.findOne({
      email,
    });

  if (!user) {
    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    user =
      await User.create({
        name,
        email,
        password:
          hashedPassword,
        role,
      });

    console.log(
      `✅ Tạo user: ${email}`
    );
  } else {
    console.log(
      `ℹ️ User đã tồn tại: ${email}`
    );
  }

  return user;
};

const ensureProduct =
  async (product) => {
    const existing =
      await Product.findOne({
        name: product.name,
      });

    if (existing) {
      await Product.findByIdAndUpdate(
        existing._id,
        product
      );

      return await Product.findById(
        existing._id
      );
    }

    return await Product.create(
      product
    );
  };

const ensureCoupon =
  async (coupon) => {
    const existing =
      await Coupon.findOne({
        code: coupon.code,
      });

    if (existing) {
      await Coupon.findByIdAndUpdate(
        existing._id,
        coupon
      );

      return;
    }

    await Coupon.create(
      coupon
    );
  };

const createDemoOrders =
  async (
    users,
    products
  ) => {
    const demoCodes = [
      "DEMO001",
      "DEMO002",
      "DEMO003",
      "DEMO004",
      "DEMO005",
      "DEMO006",
    ];

    const existed =
      await Order.countDocuments({
        orderCode: {
          $in: demoCodes,
        },
      });

    if (existed > 0) {
      console.log(
        "ℹ️ Đơn demo đã tồn tại, bỏ qua tạo lại."
      );
      return;
    }

    const findProduct =
      (name) =>
        products.find(
          (item) =>
            item.name === name
        );

    const p1 =
      findProduct(
        "Áo thun Basic đen"
      );

    const p2 =
      findProduct(
        "Quần jean xanh"
      );

    const p3 =
      findProduct(
        "Áo hoodie Basic"
      );

    const p4 =
      findProduct(
        "Áo polo xanh navy"
      );

    const p5 =
      findProduct(
        "Váy nữ dáng suông"
      );

    const orderTemplates = [
      {
        orderCode:
          "DEMO001",
        user: users[0],
        product: p1,
        quantity: 2,
        status:
          "Chờ xác nhận",
        payment: "COD",
        paymentStatus:
          "Chưa thanh toán",
      },
      {
        orderCode:
          "DEMO002",
        user: users[1],
        product: p2,
        quantity: 1,
        status:
          "Đã xác nhận",
        payment: "BANK",
        paymentStatus:
          "Đã thanh toán",
      },
      {
        orderCode:
          "DEMO003",
        user: users[2],
        product: p3,
        quantity: 1,
        status:
          "Đang giao",
        payment: "COD",
        paymentStatus:
          "Chưa thanh toán",
      },
      {
        orderCode:
          "DEMO004",
        user: users[0],
        product: p4,
        quantity: 2,
        status:
          "Đã giao",
        payment: "COD",
        paymentStatus:
          "Đã thanh toán",
      },
      {
        orderCode:
          "DEMO005",
        user: users[1],
        product: p5,
        quantity: 2,
        status:
          "Đã giao",
        payment: "BANK",
        paymentStatus:
          "Đã thanh toán",
      },
      {
        orderCode:
          "DEMO006",
        user: users[2],
        product: p1,
        quantity: 1,
        status:
          "Đã hủy",
        payment: "COD",
        paymentStatus:
          "Chưa thanh toán",
      },
    ];

    for (
      let i = 0;
      i <
      orderTemplates.length;
      i++
    ) {
      const item =
        orderTemplates[i];

      const subtotal =
        item.product.price *
        item.quantity;

      const shipping =
        subtotal >= 500000
          ? 0
          : 30000;

      let discount = 0;
      let couponCode = "";

      if (
        item.orderCode ===
        "DEMO004"
      ) {
        couponCode =
          "SALE10";

        discount =
          Math.min(
            Math.round(
              subtotal *
                0.1
            ),
            50000
          );
      }

      const total =
        subtotal +
        shipping -
        discount;

      const createdAt =
        new Date();

      createdAt.setDate(
        createdAt.getDate() -
          (
            orderTemplates.length -
            i
          )
      );

      await Order.create({
        orderCode:
          item.orderCode,

        user:
          item.user._id,

        customer: {
          name:
            item.user.name,

          phone:
            `09000000${i + 1}`,

          address:
            `${i + 10} Đường Demo, Hà Nội`,

          note:
            "Đơn hàng dữ liệu demo",

          payment:
            item.payment,
        },

        items: [
          {
            productId:
              item.product._id,

            name:
              item.product.name,

            price:
              item.product.price,

            image:
              item.product.image,

            size:
              item.product
                .sizes?.[0] ||
              "",

            color:
              item.product
                .colors?.[0] ||
              "",

            quantity:
              item.quantity,
          },
        ],

        subtotal,
        shipping,

        couponCode,
        discount,

        shippingDiscount:
          0,

        total,

        status:
          item.status,

        paymentStatus:
          item.paymentStatus,

        paidAt:
          item.paymentStatus ===
          "Đã thanh toán"
            ? createdAt
            : null,

        createdAt,
        updatedAt:
          createdAt,
      });
    }

    console.log(
      "✅ Đã tạo 6 đơn hàng demo."
    );
  };

const run =
  async () => {
    try {
      await mongoose.connect(
        MONGODB_URI
      );

      console.log(
        "✅ Đã kết nối MongoDB"
      );

      await ensureUser({
        name:
          "Admin ClothStore",

        email:
          "admin@clothstore.vn",

        password:
          "Admin123",

        role:
          "admin",
      });

      const customer1 =
        await ensureUser({
          name:
            "Nguyễn Văn An",

          email:
            "an.demo@gmail.com",

          password:
            "123456",

          role:
            "user",
        });

      const customer2 =
        await ensureUser({
          name:
            "Trần Minh Anh",

          email:
            "minhanh.demo@gmail.com",

          password:
            "123456",

          role:
            "user",
        });

      const customer3 =
        await ensureUser({
          name:
            "Lê Hoàng Nam",

          email:
            "hoangnam.demo@gmail.com",

          password:
            "123456",

          role:
            "user",
        });

      const products = [];

      for (
        const product
        of productsData
      ) {
        const result =
          await ensureProduct(
            product
          );

        products.push(
          result
        );
      }

      console.log(
        `✅ Đã đồng bộ ${products.length} sản phẩm demo.`
      );

      for (
        const coupon
        of couponsData
      ) {
        await ensureCoupon(
          coupon
        );
      }

      console.log(
        "✅ Đã đồng bộ voucher demo."
      );

      await createDemoOrders(
        [
          customer1,
          customer2,
          customer3,
        ],
        products
      );

      console.log("");
      console.log(
        "======================================"
      );

      console.log(
        "✅ HOÀN TẤT TẠO DỮ LIỆU DEMO"
      );

      console.log(
        "======================================"
      );

      console.log(
        "Admin:"
      );

      console.log(
        "Email: admin@clothstore.vn"
      );

      console.log(
        "Password: Admin123"
      );

      console.log("");

      console.log(
        "Khách demo:"
      );

      console.log(
        "an.demo@gmail.com / 123456"
      );

      console.log(
        "minhanh.demo@gmail.com / 123456"
      );

      console.log(
        "hoangnam.demo@gmail.com / 123456"
      );
    } catch (error) {
      console.error(
        "❌ Seed demo error:",
        error
      );
    } finally {
      await mongoose.disconnect();

      process.exit();
    }
  };

run();