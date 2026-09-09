import { useEffect, useMemo, useState } from "react";
import "./App.css";
import AIChat from "./AIChat";
import AdminDashboard from "./AdminDashboard";
import MaintenanceMode from "./MaintenanceMode";

const API_BASE_URL = "http://localhost:5000/api";

const formatPrice = (price) =>
  price.toLocaleString("vi-VN") + " ₫";

// Chuẩn hóa nội dung trạng thái hiển thị trên giao diện
const getOrderStatusLabel = (status) => {
  const statusMap = {
    "Trâu xác nhận": "Chờ xác nhận",
    "Cho xac nhan": "Chờ xác nhận",
    "Chờ xác nhận": "Chờ xác nhận",
    "Đã xác nhận": "Đã xác nhận",
    "Đang xử lý": "Đã xác nhận",
    "Đang giao": "Đang giao",
    "Đã giao": "Đã giao",
    "Đã hủy": "Đã hủy",
  };

  return statusMap[status] || status || "Chờ xác nhận";
};

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

const ORDER_TRACKING_STEPS = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang giao",
  "Đã giao",
];

const getOrderProgressIndex = (status) => {
  const normalizedStatus = getOrderStatusLabel(status);

  if (normalizedStatus === "Đã hủy") {
    return -1;
  }

  return ORDER_TRACKING_STEPS.indexOf(normalizedStatus);
};

function App() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  // ================= AUTH =================
  const [token, setToken] = useState(
    () => localStorage.getItem("clothstore_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("clothstore_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // ================= MAINTENANCE =================
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    title: "Hệ thống đang bảo trì",
    message:
      "ClothStore đang được nâng cấp. Vui lòng quay lại sau.",
    estimatedEnd: null,
  });

  const [maintenanceLoading, setMaintenanceLoading] =
    useState(true);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("default");

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("clothstore_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const savedFavorites =
        localStorage.getItem("clothstore_favorites");
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch {
      return [];
    }
  });

  // Sản phẩm dùng cho cổng Mua ngay
  const [buyNowItem, setBuyNowItem] = useState(null);

  // Các sản phẩm thực tế đang thanh toán
  const [checkoutItems, setCheckoutItems] = useState([]);

  // Nguồn thanh toán: cart hoặc buyNow
  const [checkoutSource, setCheckoutSource] = useState("");

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
    payment: "COD",
  });

  // ================= VOUCHER =================
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");

  const [orderCode, setOrderCode] = useState("");
  const [successSource, setSuccessSource] = useState("");
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("COD");

  // Cấu hình thanh toán chuyển khoản dùng cho bản demo đồ án.
  // Khi cần dùng tài khoản thật, chỉ thay các giá trị bên dưới.
  const BANK_TRANSFER_INFO = {
    bankName: "Ngân hàng demo ClothStore",
    accountName: "CLOTHSTORE DEMO",
    accountNumber: "0000000000",
  };

  // ================= REVIEWS =================
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    reviewCount: 0,
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Điểm đánh giá hiển thị ngay trên từng thẻ sản phẩm
  const [productReviewStats, setProductReviewStats] = useState({});

  // Lấy trạng thái bảo trì công khai
  useEffect(() => {
    let cancelled = false;

    const fetchMaintenance = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/settings/public`
        );

        const data = await response.json();

        if (
          !cancelled &&
          response.ok &&
          data.success
        ) {
          setMaintenance({
            enabled: Boolean(
              data.maintenance?.enabled
            ),
            title:
              data.maintenance?.title ||
              "Hệ thống đang bảo trì",
            message:
              data.maintenance?.message ||
              "ClothStore đang được nâng cấp. Vui lòng quay lại sau.",
            estimatedEnd:
              data.maintenance?.estimatedEnd ||
              null,
          });
        }
      } catch (error) {
        console.error(
          "Fetch maintenance error:",
          error
        );
      } finally {
        if (!cancelled) {
          setMaintenanceLoading(false);
        }
      }
    };

    fetchMaintenance();

    return () => {
      cancelled = true;
    };
  }, []);

  // Lấy sản phẩm trực tiếp từ MongoDB thông qua Backend API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        setProductError("");

        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Không thể tải danh sách sản phẩm"
          );
        }

        const normalizedProducts = (data.products || []).map(
          (product) => ({
            ...product,
            id: product._id,
          })
        );

        setProducts(normalizedProducts);
      } catch (error) {
        console.error("Fetch products error:", error);
        setProductError(
          "Không thể kết nối đến máy chủ sản phẩm. Hãy kiểm tra Backend đang chạy ở cổng 5000."
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Lấy điểm đánh giá của tất cả sản phẩm để hiển thị trên thẻ sản phẩm
  useEffect(() => {
    if (!products.length) {
      setProductReviewStats({});
      return;
    }

    let cancelled = false;

    const fetchAllProductReviewStats = async () => {
      try {
        const results = await Promise.all(
          products.map(async (product) => {
            const productId = product.id || product._id;

            try {
              const response = await fetch(
                `${API_BASE_URL}/reviews/product/${productId}`
              );

              const data = await response.json();

              if (!response.ok || !data.success) {
                return [
                  productId,
                  {
                    averageRating: 0,
                    reviewCount: 0,
                  },
                ];
              }

              return [
                productId,
                {
                  averageRating: Number(data.averageRating || 0),
                  reviewCount: Number(data.reviewCount || 0),
                },
              ];
            } catch (error) {
              console.error(
                `Fetch review stats error (${productId}):`,
                error
              );

              return [
                productId,
                {
                  averageRating: 0,
                  reviewCount: 0,
                },
              ];
            }
          })
        );

        if (!cancelled) {
          setProductReviewStats(
            Object.fromEntries(results)
          );
        }
      } catch (error) {
        console.error(
          "Fetch all review stats error:",
          error
        );
      }
    };

    fetchAllProductReviewStats();

    return () => {
      cancelled = true;
    };
  }, [products]);

  // Kiểm tra token hiện tại
  useEffect(() => {
    const checkLogin = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          localStorage.removeItem("clothstore_token");
          localStorage.removeItem("clothstore_user");
          setToken("");
          setCurrentUser(null);
          return;
        }

        setCurrentUser(data.user);
        localStorage.setItem(
          "clothstore_user",
          JSON.stringify(data.user)
        );
      } catch (error) {
        console.error("Check login error:", error);
      }
    };

    checkLogin();
  }, [token]);

  // Lưu giỏ hàng
  useEffect(() => {
    localStorage.setItem(
      "clothstore_cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  // Lưu yêu thích
  useEffect(() => {
    localStorage.setItem(
      "clothstore_favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  // Danh mục
  const categories = ["Tất cả", "Áo", "Quần", "Áo khoác"];

  // Lọc + tìm kiếm + sắp xếp
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "Tất cả") {
      result = result.filter(
        (product) => product.category === selectedCategory
      );
    }

    if (searchTerm.trim()) {
      const keyword = normalizeText(searchTerm);

      result = result.filter((product) => {
        return (
          normalizeText(product.name).includes(keyword) ||
          normalizeText(product.category).includes(keyword) ||
          normalizeText(product.description).includes(keyword)
        );
      });
    }

    if (sortOption === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sortOption === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sortOption === "name-asc") {
      result.sort((a, b) =>
        a.name.localeCompare(b.name, "vi")
      );
    }

    return result;
  }, [products, selectedCategory, searchTerm, sortOption]);

  // Sản phẩm liên quan trong cửa sổ chi tiết
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];

    const selectedId =
      selectedProduct.id || selectedProduct._id;

    const selectedPrice =
      Number(selectedProduct.price || 0);

    return products
      .filter((product) => {
        const productId =
          product.id || product._id;

        return productId !== selectedId;
      })
      .map((product) => ({
        ...product,
        __sameCategory:
          product.category === selectedProduct.category
            ? 1
            : 0,
        __priceDistance: Math.abs(
          Number(product.price || 0) -
            selectedPrice
        ),
      }))
      .sort((a, b) => {
        if (
          b.__sameCategory !==
          a.__sameCategory
        ) {
          return (
            b.__sameCategory -
            a.__sameCategory
          );
        }

        return (
          a.__priceDistance -
          b.__priceDistance
        );
      })
      .slice(0, 4);
  }, [products, selectedProduct]);

  // Tổng số lượng trong giỏ
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Tổng tiền giỏ hàng
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Tổng tiền sản phẩm đang checkout
  const checkoutSubtotal = checkoutItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const shippingFee =
    checkoutSubtotal >= 500000 || checkoutSubtotal === 0
      ? 0
      : 30000;

  const couponDiscount = Number(
    appliedCoupon?.discount || 0
  );

  const couponShippingDiscount = Number(
    appliedCoupon?.shippingDiscount || 0
  );

  const checkoutTotal = Math.max(
    0,
    checkoutSubtotal +
      shippingFee -
      couponDiscount -
      couponShippingDiscount
  );

  const getTransferContent = (code) =>
    `CLOTHSTORE ${code || "DONHANG"}`;

  const getDemoQrUrl = (code, amount) => {
    const qrText = [
      "CLOTHSTORE PAYMENT DEMO",
      `ORDER=${code || "PENDING"}`,
      `AMOUNT=${Number(amount || 0)}`,
      `ACCOUNT=${BANK_TRANSFER_INFO.accountNumber}`,
      `CONTENT=${getTransferContent(code)}`,
    ].join("|");

    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      qrText
    )}`;
  };

  const copyTransferContent = async (code) => {
    try {
      await navigator.clipboard.writeText(
        getTransferContent(code)
      );
      alert("Đã sao chép nội dung chuyển khoản.");
    } catch {
      alert(
        `Nội dung chuyển khoản: ${getTransferContent(code)}`
      );
    }
  };

  const resetCoupon = () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponError("");
    setCouponLoading(false);
  };

  const applyCoupon = async () => {
    if (!token || !currentUser) {
      alert("Bạn cần đăng nhập trước khi dùng mã giảm giá.");
      openLogin();
      return;
    }

    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponMessage("");
      setCouponError("Vui lòng nhập mã giảm giá.");
      return;
    }

    if (checkoutSubtotal <= 0) {
      setCouponMessage("");
      setCouponError("Chưa có sản phẩm để áp dụng mã.");
      return;
    }

    try {
      setCouponLoading(true);
      setCouponMessage("");
      setCouponError("");

      const response = await fetch(
        `${API_BASE_URL}/coupons/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
            subtotal: checkoutSubtotal,
            shipping: shippingFee,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể áp dụng mã giảm giá"
        );
      }

      setAppliedCoupon({
        ...(data.coupon || {}),
        code: data.coupon?.code || code,
        discount: Number(data.discount || 0),
        shippingDiscount: Number(
          data.shippingDiscount || 0
        ),
        total: Number(data.total || 0),
      });

      setCouponInput(data.coupon?.code || code);

      setCouponMessage(
        data.message || "Áp dụng mã giảm giá thành công."
      );
    } catch (error) {
      console.error("Apply coupon error:", error);
      setAppliedCoupon(null);
      setCouponMessage("");
      setCouponError(
        error.message || "Không thể áp dụng mã giảm giá."
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponError("");
  };

  // Mở sản phẩm
  const openProduct = (product) => {
    setSelectedProduct(product);

    setSelectedSize(product.sizes?.[0] || "");
    setSelectedColor(product.colors?.[0] || "");
    setQuantity(1);
    setReviews([]);
    setReviewStats({
      averageRating: 0,
      reviewCount: 0,
    });
    setReviewRating(5);
    setReviewComment("");

    fetchReviews(product.id || product._id);
  };

  // Đóng sản phẩm
  const closeProduct = () => {
    setSelectedProduct(null);
  };

  // Yêu thích
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });
  };

  // Thêm vào giỏ hàng
  const addToCart = () => {
    if (!selectedProduct) return;

    const newItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      size: selectedSize,
      color: selectedColor,
      quantity,
    };

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.size === newItem.size &&
          item.color === newItem.color
      );

      if (existingIndex !== -1) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
      }

      return [...prev, newItem];
    });

    setSelectedProduct(null);
    setShowCart(true);
  };

  // Mở cổng Mua ngay
  const openBuyNow = () => {
    if (!selectedProduct) return;

    setBuyNowItem({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });

    setShowBuyNow(true);
  };

  // Xác nhận lựa chọn ở cổng Mua ngay
  const confirmBuyNow = () => {
    if (!buyNowItem) return;

    const item = {
      ...buyNowItem,
      size: selectedSize,
      color: selectedColor,
      quantity,
    };

    setBuyNowItem(item);
    setCheckoutItems([item]);
    setCheckoutSource("buyNow");
    resetCoupon();

    setShowBuyNow(false);
    setSelectedProduct(null);
    setShowCheckout(true);
  };

  // Mở checkout từ giỏ hàng
  const checkoutFromCart = () => {
    if (cart.length === 0) {
      alert("Giỏ hàng đang trống!");
      return;
    }

    setCheckoutItems([...cart]);
    setCheckoutSource("cart");
    resetCoupon();

    setShowCart(false);
    setShowCheckout(true);
  };

  // Thay đổi số lượng trong giỏ
  const updateCartQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;

    setCart((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: newQuantity,
            }
          : item
      )
    );
  };

  // Xóa sản phẩm khỏi giỏ
  const removeFromCart = (index) => {
    setCart((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // Thay đổi thông tin khách hàng
  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tạo mã đơn hàng dự phòng ở Frontend
  const generateOrderCode = () => {
    const now = new Date();

    const date =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const randomNumber = Math.floor(
      1000 + Math.random() * 9000
    );

    return `DH${date}${randomNumber}`;
  };

  // ================= AUTH =================

  const openLogin = () => {
    setAuthMode("login");
    setAuthForm({
      name: "",
      email: "",
      password: "",
    });
    setShowAuth(true);
  };

  const openRegister = () => {
    setAuthMode("register");
    setAuthForm({
      name: "",
      email: "",
      password: "",
    });
    setShowAuth(true);
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    if (authMode === "register" && !authForm.name.trim()) {
      alert("Vui lòng nhập họ tên!");
      return;
    }

    if (!authForm.email.trim()) {
      alert("Vui lòng nhập email!");
      return;
    }

    if (!authForm.password) {
      alert("Vui lòng nhập mật khẩu!");
      return;
    }

    if (authForm.password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login"
          ? `${API_BASE_URL}/auth/login`
          : `${API_BASE_URL}/auth/register`;

      const body =
        authMode === "login"
          ? {
              email: authForm.email.trim(),
              password: authForm.password,
            }
          : {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể thực hiện yêu cầu"
        );
      }

      localStorage.setItem("clothstore_token", data.token);
      localStorage.setItem(
        "clothstore_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setCurrentUser(data.user);
      setShowAuth(false);

      alert(
        authMode === "login"
          ? "Đăng nhập thành công!"
          : "Đăng ký tài khoản thành công!"
      );
    } catch (error) {
      console.error("Auth error:", error);
      alert(error.message || "Có lỗi xảy ra");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    if (!token) return;

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const response = await fetch(
        `${API_BASE_URL}/orders/my-orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể lấy lịch sử đơn hàng"
        );
      }

      setMyOrders(data.orders || []);
    } catch (error) {
      console.error("Fetch my orders error:", error);
      setOrdersError(
        error.message || "Không thể lấy lịch sử đơn hàng"
      );
    } finally {
      setOrdersLoading(false);
    }
  };

  const cancelMyOrder = async (order) => {
    if (!order?._id || !token) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy đơn ${order.orderCode} không?`
    );

    if (!confirmed) return;

    try {
      setCancellingOrder(true);

      const response = await fetch(
        `${API_BASE_URL}/orders/${order._id}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể hủy đơn hàng"
        );
      }

      alert(data.message || "Đã hủy đơn hàng.");

      setSelectedOrder(data.order);

      setMyOrders((prev) =>
        prev.map((item) =>
          item._id === data.order._id
            ? data.order
            : item
        )
      );

      // Cập nhật lại sản phẩm để tồn kho hiển thị đúng
      try {
        const productsResponse = await fetch(
          `${API_BASE_URL}/products`
        );

        const productsData =
          await productsResponse.json();

        if (productsData.success) {
          setProducts(
            (productsData.products || []).map(
              (product) => ({
                ...product,
                id: product._id,
              })
            )
          );
        }
      } catch (refreshError) {
        console.error(
          "Refresh products after cancel error:",
          refreshError
        );
      }
    } catch (error) {
      console.error(
        "Cancel order error:",
        error
      );

      alert(
        error.message ||
          "Không thể hủy đơn hàng"
      );
    } finally {
      setCancellingOrder(false);
    }
  };

  const openAccount = () => {
    if (!currentUser || !token) {
      openLogin();
      return;
    }

    setShowAccount(true);
    fetchMyOrders();
  };

  const handleLogout = () => {
    localStorage.removeItem("clothstore_token");
    localStorage.removeItem("clothstore_user");

    setToken("");
    setCurrentUser(null);
    setShowAccount(false);
    setShowAdminDashboard(false);
    setSelectedOrder(null);
    setMyOrders([]);

    alert("Đã đăng xuất tài khoản.");
  };

  // ================= ORDER =================

  // Xác nhận mua / đặt hàng và lưu vào MongoDB
  const createOrder = async (event) => {
    event.preventDefault();

    if (!token || !currentUser) {
      alert("Bạn cần đăng nhập trước khi đặt hàng.");
      openLogin();
      return;
    }

    if (!customer.name.trim()) {
      alert("Vui lòng nhập họ và tên!");
      return;
    }

    if (!customer.phone.trim()) {
      alert("Vui lòng nhập số điện thoại!");
      return;
    }

    if (!customer.address.trim()) {
      alert("Vui lòng nhập địa chỉ nhận hàng!");
      return;
    }

    if (checkoutItems.length === 0) {
      alert("Không có sản phẩm để mua!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer,
          items: checkoutItems.map((item) => ({
            productId: item.id || item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
          couponCode:
            appliedCoupon?.code || "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          localStorage.removeItem("clothstore_token");
          localStorage.removeItem("clothstore_user");
          setToken("");
          setCurrentUser(null);
        }

        throw new Error(
          data.message || "Không thể tạo đơn hàng"
        );
      }

      const savedOrder = data.order;

      if (checkoutSource === "cart") {
        setCart([]);
      }

      setOrderCode(savedOrder.orderCode);
      setSuccessSource(checkoutSource);
      setLastOrderTotal(Number(savedOrder.total || checkoutTotal));
      setLastPaymentMethod(
        savedOrder.customer?.payment || customer.payment || "COD"
      );
      setShowCheckout(false);
      setShowSuccess(true);

      setCheckoutItems([]);
      setCheckoutSource("");
      resetCoupon();

      // Cập nhật lại tồn kho/sản phẩm từ MongoDB
      try {
        const productsResponse = await fetch(
          `${API_BASE_URL}/products`
        );
        const productsData = await productsResponse.json();

        if (productsData.success) {
          setProducts(
            (productsData.products || []).map((product) => ({
              ...product,
              id: product._id,
            }))
          );
        }
      } catch (refreshError) {
        console.error(
          "Refresh products error:",
          refreshError
        );
      }
    } catch (error) {
      console.error("Create order error:", error);
      alert(error.message || "Không thể tạo đơn hàng");
    }
  };

  // ================= REVIEWS =================
  const fetchReviews = async (productId) => {
    if (!productId) return;

    try {
      setReviewsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/reviews/product/${productId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải đánh giá sản phẩm"
        );
      }

      setReviews(data.reviews || []);
      const nextReviewStats = {
        averageRating: Number(data.averageRating || 0),
        reviewCount: Number(data.reviewCount || 0),
      };

      setReviewStats(nextReviewStats);

      setProductReviewStats((prev) => ({
        ...prev,
        [productId]: nextReviewStats,
      }));

      if (currentUser) {
        const mine = (data.reviews || []).find(
          (review) =>
            String(review.user?._id || review.user) ===
            String(currentUser._id || currentUser.id)
        );

        if (mine) {
          setReviewRating(Number(mine.rating || 5));
          setReviewComment(mine.comment || "");
        } else {
          setReviewRating(5);
          setReviewComment("");
        }
      }
    } catch (error) {
      console.error("Fetch reviews error:", error);
      setReviews([]);
      setReviewStats({
        averageRating: 0,
        reviewCount: 0,
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  const submitReview = async (event) => {
    event?.preventDefault?.();

    if (!selectedProduct) return;

    if (!token || !currentUser) {
      alert("Bạn cần đăng nhập để đánh giá sản phẩm.");
      openLogin();
      return;
    }

    if (
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      alert("Vui lòng chọn từ 1 đến 5 sao.");
      return;
    }

    if (!reviewComment.trim()) {
      alert("Vui lòng nhập nhận xét của bạn.");
      return;
    }

    try {
      setReviewSubmitting(true);

      const productId =
        selectedProduct.id ||
        selectedProduct._id;

      const response = await fetch(
        `${API_BASE_URL}/reviews/product/${productId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: reviewRating,
            comment: reviewComment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể gửi đánh giá"
        );
      }

      alert(data.message || "Đã lưu đánh giá.");
      await fetchReviews(productId);
    } catch (error) {
      console.error("Submit review error:", error);
      alert(error.message || "Không thể gửi đánh giá");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Cuộn đến sản phẩm
  const scrollToProducts = () => {
    document
      .getElementById("products")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  if (showAdminDashboard && currentUser?.role === "admin") {
    return (
      <AdminDashboard
        token={token}
        onClose={() => setShowAdminDashboard(false)}
      />
    );
  }

  if (
    !maintenanceLoading &&
    maintenance.enabled &&
    currentUser?.role !== "admin"
  ) {
    return (
      <MaintenanceMode
        maintenance={maintenance}
        onAdminLogin={({ token: adminToken, user }) => {
          localStorage.setItem(
            "clothstore_token",
            adminToken
          );

          localStorage.setItem(
            "clothstore_user",
            JSON.stringify(user)
          );

          setToken(adminToken);
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="app">
      {/* ================= TOP PROMO ================= */}
      <div className="store-promo-bar">
        <div>🚚 Miễn phí vận chuyển cho đơn từ 500.000 ₫</div>
        <div className="store-promo-codes">
          🎁 SALE10 - Giảm 10% &nbsp; | &nbsp; GIAM50K - Giảm 50.000 ₫ &nbsp; | &nbsp; FREESHIP
        </div>
        <div>✨ Mua sắm thông minh cùng AI</div>
      </div>

      {/* ================= HEADER ================= */}
      <header className="header modern-header">
        <div className="logo modern-logo">
          <span className="logo-mark">👕</span>

          <div className="logo-copy">
            <strong>ClothStore</strong>
            <small>MẶC ĐẸP HƠN MỖI NGÀY</small>
          </div>
        </div>

        <nav className="nav modern-nav">
          <a href="#home" className="active-link">⌂ Trang chủ</a>
          <a href="#products">🛍️ Sản phẩm</a>
          <a href="#categories">▦ Danh mục</a>
          <a href="#ai">✨ AI tư vấn</a>
          <a href="#about">ⓘ Giới thiệu</a>
        </nav>

        <div className="header-actions modern-header-actions">
          <button
            className="icon-button modern-icon-button"
            onClick={scrollToProducts}
            title="Tìm kiếm sản phẩm"
          >
            🔍
          </button>

          <button
            className="icon-button modern-account-button"
            onClick={currentUser ? openAccount : openLogin}
            title={currentUser ? "Tài khoản" : "Đăng nhập"}
          >
            👤
            <span className="modern-account-copy">
              {currentUser ? currentUser.name : "Tài khoản"}
            </span>
          </button>

          {currentUser?.role === "admin" && (
            <button
              type="button"
              className="modern-admin-button"
              onClick={() => {
                setShowAccount(false);
                setShowAdminDashboard(true);
              }}
              title="Mở trang quản trị"
            >
              ⚙️ Quản trị
            </button>
          )}

          <button
            className="cart-button modern-cart-button"
            onClick={() => setShowCart(true)}
          >
            🛒
            <span>Giỏ hàng</span>

            {cartCount > 0 && (
              <span className="cart-count">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero modern-hero" id="home">
        <div className="modern-hero-overlay"></div>

        <div className="hero-content modern-hero-content">
          <span className="modern-hero-eyebrow">
            THỜI TRANG HIỆN ĐẠI · BỘ SƯU TẬP MỚI
          </span>

          <h1>
            Mặc đẹp hơn
            <br />
            <span>mỗi ngày</span>
          </h1>

          <p>
            Khám phá thời trang trẻ trung, dễ phối và phù hợp
            với phong cách của bạn. AI ClothStore luôn sẵn sàng
            hỗ trợ tìm sản phẩm phù hợp.
          </p>

          <div className="modern-hero-actions">
            <button
              className="primary-button modern-shop-now"
              onClick={scrollToProducts}
            >
              Khám phá ngay →
            </button>

            <button
              type="button"
              className="modern-ai-hero-button"
              onClick={() => {
                const aiSection = document.getElementById("ai");
                aiSection?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              ✨ Nhận tư vấn AI
            </button>
          </div>

          <div className="modern-hero-points">
            <span>✓ 100+ sản phẩm</span>
            <span>✓ Tồn kho rõ ràng</span>
            <span>✓ Đổi trả dễ dàng</span>
          </div>
        </div>
      </section>

      {/* ================= QUICK BENEFITS ================= */}
      <section className="modern-benefits">
        <article>
          <span>🚚</span>
          <div>
            <strong>Miễn phí vận chuyển</strong>
            <small>Đơn hàng từ 500.000 ₫</small>
          </div>
        </article>

        <article>
          <span>↻</span>
          <div>
            <strong>Đổi trả dễ dàng</strong>
            <small>Hỗ trợ đổi trả theo chính sách</small>
          </div>
        </article>

        <article>
          <span>🔒</span>
          <div>
            <strong>Thanh toán an toàn</strong>
            <small>COD và chuyển khoản</small>
          </div>
        </article>

        <article>
          <span>✨</span>
          <div>
            <strong>AI tư vấn</strong>
            <small>Gợi ý theo nhu cầu của bạn</small>
          </div>
        </article>
      </section>

      {/* ================= CATEGORY ================= */}
      <section
        className="category-section modern-category-section"
        id="categories"
      >
        <div className="section-heading modern-section-heading">
          <div>
            <span>DANH MỤC</span>
            <h2>Khám phá theo phong cách</h2>
          </div>

          <button
            type="button"
            className="modern-view-all"
            onClick={() => {
              setSelectedCategory("Tất cả");
              scrollToProducts();
            }}
          >
            Xem tất cả →
          </button>
        </div>

        <div className="modern-category-grid">
          {categories.map((category) => {
            const categoryMeta = {
              "Tất cả": ["✨", "Tất cả sản phẩm"],
              "Áo": ["👕", "Áo thời trang"],
              "Quần": ["👖", "Quần thời trang"],
              "Áo khoác": ["🧥", "Áo khoác"],
              "Váy": ["👗", "Váy & chân váy"],
              "Phụ kiện": ["🧢", "Phụ kiện"],
            };

            const [icon, label] =
              categoryMeta[category] || ["🛍️", category];

            return (
              <button
                type="button"
                key={category}
                className={
                  selectedCategory === category
                    ? "modern-category-card active"
                    : "modern-category-card"
                }
                onClick={() => {
                  setSelectedCategory(category);
                  document
                    .getElementById("products")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
              >
                <span className="modern-category-icon">
                  {icon}
                </span>

                <span className="modern-category-name">
                  {label}
                </span>

                <small>
                  {category === "Tất cả"
                    ? `${products.length} sản phẩm`
                    : `${products.filter(
                        (product) =>
                          product.category === category
                      ).length} sản phẩm`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section className="products-section" id="products">
        <div className="section-heading modern-section-heading product-section-heading">
          <div>
            <span>BỘ SƯU TẬP</span>
            <h2>Sản phẩm nổi bật</h2>
            <p className="modern-section-subtitle">
              Khám phá các sản phẩm mới, dễ phối và đang được yêu thích.
            </p>
          </div>

          <div className="modern-product-count">
            {filteredProducts.length} sản phẩm
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="product-tools">
          <div className="search-box">
            <span>🔍</span>

            <input
              id="product-search"
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="sort-box">
            <label htmlFor="sort-product">
              Sắp xếp:
            </label>

            <select
              id="sort-product"
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value)
              }
            >
              <option value="default">
                Mặc định
              </option>

              <option value="price-asc">
                Giá thấp → cao
              </option>

              <option value="price-desc">
                Giá cao → thấp
              </option>

              <option value="name-asc">
                Tên A → Z
              </option>
            </select>
          </div>
        </div>

        {loadingProducts ? (
          <div className="no-products">
            <div>⏳</div>
            <h3>Đang tải sản phẩm...</h3>
            <p>Đang lấy dữ liệu sản phẩm từ MongoDB.</p>
          </div>
        ) : productError ? (
          <div className="no-products">
            <div>⚠️</div>
            <h3>Không thể tải sản phẩm</h3>
            <p>{productError}</p>
            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-products">
            <div>😢</div>

            <h3>Không tìm thấy sản phẩm</h3>

            <p>
              Hãy thử tìm kiếm bằng từ khóa khác.
            </p>

            <button
              className="secondary-button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("Tất cả");
              }}
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div
                className="product-card"
                key={product.id}
              >
                <div className="product-image-wrapper">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />

                  <button
                    className={
                      favorites.includes(product.id)
                        ? "favorite-button favorite-active"
                        : "favorite-button"
                    }
                    onClick={() =>
                      toggleFavorite(product.id)
                    }
                  >
                    {favorites.includes(product.id)
                      ? "♥"
                      : "♡"}
                  </button>

                  <span className="product-category">
                    {product.category}
                  </span>
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>

                  {(() => {
                    const productId =
                      product.id || product._id;

                    const stats =
                      productReviewStats[productId] || {
                        averageRating: 0,
                        reviewCount: 0,
                      };

                    const roundedRating = Math.max(
                      0,
                      Math.min(
                        5,
                        Math.round(
                          Number(stats.averageRating || 0)
                        )
                      )
                    );

                    return (
                      <div className="product-card-rating">
                        <span
                          className="product-card-stars"
                          aria-label={`${Number(
                            stats.averageRating || 0
                          ).toFixed(1)} trên 5 sao`}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={
                                star <= roundedRating
                                  ? "rating-star active"
                                  : "rating-star"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </span>

                        {stats.reviewCount > 0 ? (
                          <>
                            <strong>
                              {Number(
                                stats.averageRating || 0
                              ).toFixed(1)}
                            </strong>

                            <span>
                              ({stats.reviewCount})
                            </span>
                          </>
                        ) : (
                          <span className="product-card-no-rating">
                            Chưa có đánh giá
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <p className="product-description">
                    {product.description}
                  </p>

                  <div className="product-bottom">
                    <strong>
                      {formatPrice(product.price)}
                    </strong>

                    <button
                      className="view-product-button"
                      onClick={() =>
                        openProduct(product)
                      }
                    >
                      Xem sản phẩm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= AI ================= */}
      <section className="ai-section" id="ai">
        <div className="ai-content">
          <span className="ai-badge">
            🤖 AI SMART SHOPPING
          </span>

          <h2>
            Trợ lý thời trang
            <br />
            <span>thông minh</span>
          </h2>

          <p>
            AI sẽ phân tích nhu cầu của bạn để
            tư vấn sản phẩm, màu sắc và phong cách
            phù hợp nhất.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              document
                .querySelector(".ai-floating-button")
                ?.click()
            }
          >
            Trải nghiệm AI →
          </button>
        </div>

        <div className="ai-box">
          <div className="ai-avatar">🤖</div>

          <div className="ai-message">
            <strong>AI Fashion Assistant</strong>

            <p>
              Xin chào! Tôi có thể giúp bạn tìm
              một bộ trang phục phù hợp.
            </p>
          </div>

          <div className="ai-suggestions">
            <button>Áo đi học</button>
            <button>Đồ đi chơi</button>
            <button>Phong cách trẻ trung</button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer" id="about">
        <div className="footer-column">
          <div className="logo footer-logo">
            <span className="logo-icon">👕</span>
            <span>ClothStore</span>
          </div>

          <p>
            Website bán quần áo trực tuyến tích hợp
            trí tuệ nhân tạo.
          </p>
        </div>

        <div className="footer-column">
          <h3>Danh mục</h3>
          <a href="#products">Áo</a>
          <a href="#products">Quần</a>
          <a href="#products">Áo khoác</a>
        </div>

        <div className="footer-column">
          <h3>Hỗ trợ</h3>
          <a href="#home">Trang chủ</a>
          <a href="#ai">AI tư vấn</a>
          <a href="#products">Sản phẩm</a>
        </div>

        <div className="footer-column">
          <h3>Liên hệ</h3>
          <p>📧 support@clothstore.vn</p>
          <p>📞 0123 456 789</p>
        </div>
      </footer>

      {/* ================= PRODUCT DETAIL MODAL ================= */}
      {selectedProduct && (
        <div
          className="modal-overlay"
          onClick={closeProduct}
        >
          <div
            className="product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={closeProduct}
            >
              ×
            </button>

            <div className="modal-product-image">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
              />
            </div>

            <div className="modal-product-info">
              <span className="modal-category">
                {selectedProduct.category}
              </span>

              <h2>{selectedProduct.name}</h2>

              <div className="modal-price">
                {formatPrice(selectedProduct.price)}
              </div>

              <div className="review-summary-inline">
                <span className="review-summary-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <=
                        Math.round(reviewStats.averageRating)
                          ? "rating-star active"
                          : "rating-star"
                      }
                    >
                      ★
                    </span>
                  ))}
                </span>

                <strong>
                  {reviewStats.reviewCount > 0
                    ? reviewStats.averageRating.toFixed(1)
                    : "Chưa có"}
                </strong>

                <span>
                  ({reviewStats.reviewCount} đánh giá)
                </span>
              </div>

              <p className="modal-description">
                {selectedProduct.description}
              </p>

              <div
                className={`product-stock-status ${
                  Number(
                    selectedProduct.stock || 0
                  ) <= 0
                    ? "out"
                    : Number(
                        selectedProduct.stock || 0
                      ) <= 10
                    ? "low"
                    : "ok"
                }`}
              >
                {Number(
                  selectedProduct.stock || 0
                ) <= 0
                  ? "⛔ Sản phẩm hiện đã hết hàng"
                  : Number(
                      selectedProduct.stock || 0
                    ) <= 10
                  ? `⚠️ Chỉ còn ${Number(
                      selectedProduct.stock || 0
                    )} sản phẩm`
                  : `✅ Còn hàng · ${Number(
                      selectedProduct.stock || 0
                    )} sản phẩm`}
              </div>

              {/* SIZE */}
              <div className="option-group">
                <label>Chọn size:</label>

                <div className="option-list">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      className={
                        selectedSize === size
                          ? "option-button selected"
                          : "option-button"
                      }
                      onClick={() =>
                        setSelectedSize(size)
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR */}
              <div className="option-group">
                <label>Chọn màu:</label>

                <div className="option-list">
                  {selectedProduct.colors.map(
                    (color) => (
                      <button
                        key={color}
                        className={
                          selectedColor === color
                            ? "option-button selected"
                            : "option-button"
                        }
                        onClick={() =>
                          setSelectedColor(color)
                        }
                      >
                        {color}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* QUANTITY */}
              <div className="option-group">
                <label>Số lượng:</label>

                <div className="quantity-control">
                  <button
                    onClick={() =>
                      setQuantity((prev) =>
                        Math.max(1, prev - 1)
                      )
                    }
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    disabled={
                      quantity >=
                      Number(
                        selectedProduct.stock || 0
                      )
                    }
                    onClick={() =>
                      setQuantity((prev) =>
                        Math.min(
                          Math.max(
                            1,
                            Number(
                              selectedProduct.stock ||
                                0
                            )
                          ),
                          prev + 1
                        )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="purchase-buttons">
                <button
                  className="add-cart-large"
                  disabled={
                    Number(
                      selectedProduct.stock || 0
                    ) <= 0
                  }
                  onClick={addToCart}
                >
                  {Number(
                    selectedProduct.stock || 0
                  ) <= 0
                    ? "⛔ Hết hàng"
                    : "🛒 Thêm vào giỏ hàng"}
                </button>

                <button
                  className="buy-now-large"
                  disabled={
                    Number(
                      selectedProduct.stock || 0
                    ) <= 0
                  }
                  onClick={openBuyNow}
                >
                  ⚡ Mua ngay
                </button>
              </div>
            </div>

            <section className="product-reviews-section">
              <div className="product-reviews-heading">
                <div>
                  <span>Ý KIẾN KHÁCH HÀNG</span>
                  <h3>Đánh giá sản phẩm</h3>
                </div>

                <div className="review-overall-score">
                  <strong>
                    {reviewStats.reviewCount > 0
                      ? reviewStats.averageRating.toFixed(1)
                      : "0.0"}
                  </strong>

                  <div>
                    <div className="review-stars-static">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={
                            star <=
                            Math.round(reviewStats.averageRating)
                              ? "rating-star active"
                              : "rating-star"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <small>
                      {reviewStats.reviewCount} lượt đánh giá
                    </small>
                  </div>
                </div>
              </div>

              <div className="product-review-layout">
                <div className="review-form-card">
                  <h4>Viết đánh giá của bạn</h4>

                  {!currentUser ? (
                    <div className="review-login-required">
                      <p>
                        Bạn cần đăng nhập để gửi đánh giá.
                      </p>

                      <button
                        type="button"
                        onClick={openLogin}
                      >
                        👤 Đăng nhập
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(event) => event.preventDefault()}>
                      <label>Chọn số sao</label>

                      <div className="review-star-picker">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <button
                              key={star}
                              type="button"
                              className={
                                star <= reviewRating
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setReviewRating(star)
                              }
                              title={`${star} sao`}
                            >
                              ★
                            </button>
                          )
                        )}
                      </div>

                      <label htmlFor="review-comment">
                        Nhận xét
                      </label>

                      <textarea
                        id="review-comment"
                        rows="4"
                        maxLength="1000"
                        placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm..."
                        value={reviewComment}
                        onChange={(event) =>
                          setReviewComment(
                            event.target.value
                          )
                        }
                      />

                      <div className="review-form-footer">
                        <small>
                          {reviewComment.length}/1000
                        </small>

                        <button
                          type="button"
                          disabled={reviewSubmitting}
                          onClick={submitReview}
                        >
                          {reviewSubmitting
                            ? "⏳ Đang lưu..."
                            : "⭐ Gửi đánh giá"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="review-list-card">
                  <h4>
                    Nhận xét khách hàng
                    <span>
                      {reviewStats.reviewCount}
                    </span>
                  </h4>

                  {reviewsLoading ? (
                    <div className="review-empty">
                      ⏳ Đang tải đánh giá...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="review-empty">
                      <div>💬</div>
                      <strong>
                        Chưa có đánh giá nào
                      </strong>
                      <p>
                        Hãy là người đầu tiên nhận xét
                        sản phẩm này.
                      </p>
                    </div>
                  ) : (
                    <div className="review-list">
                      {reviews.map((review) => (
                        <article
                          className="review-item"
                          key={review._id}
                        >
                          <div className="review-item-top">
                            <div className="review-user">
                              <div className="review-avatar">
                                {(
                                  review.user?.name ||
                                  "K"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {review.user?.name ||
                                    "Khách hàng"}
                                </strong>

                                <small>
                                  {new Date(
                                    review.updatedAt ||
                                      review.createdAt
                                  ).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </small>
                              </div>
                            </div>

                            <div className="review-item-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={
                                    star <= Number(review.rating || 0)
                                      ? "rating-star active"
                                      : "rating-star"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>

                          <p>{review.comment}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {relatedProducts.length > 0 && (
              <div className="related-products-modal">
                <div className="related-products-heading">
                  <div>
                    <span>CÓ THỂ BẠN SẼ THÍCH</span>
                    <h3>Sản phẩm liên quan</h3>
                  </div>

                  <small>
                    Ưu tiên cùng danh mục và mức giá gần nhau
                  </small>
                </div>

                <div className="related-products-grid">
                  {relatedProducts.map(
                    (product) => (
                      <button
                        type="button"
                        className="related-product-card"
                        key={
                          product.id ||
                          product._id
                        }
                        onClick={() =>
                          openProduct(
                            product
                          )
                        }
                      >
                        <div className="related-product-image">
                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                          />

                          {Number(
                            product.stock ||
                              0
                          ) <= 0 && (
                            <span>
                              Hết hàng
                            </span>
                          )}
                        </div>

                        <div className="related-product-info">
                          <small>
                            {
                              product.category
                            }
                          </small>

                          <strong>
                            {
                              product.name
                            }
                          </strong>

                          <span>
                            {formatPrice(
                              Number(
                                product.price ||
                                  0
                              )
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= BUY NOW GATE ================= */}
      {showBuyNow && buyNowItem && (
        <div
          className="modal-overlay"
          onClick={() => setShowBuyNow(false)}
        >
          <div
            className="buy-now-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowBuyNow(false)}
            >
              ×
            </button>

            <div className="buy-now-header">
              <span className="buy-now-icon">
                ⚡
              </span>

              <div>
                <h2>Mua ngay</h2>
                <p>
                  Kiểm tra lựa chọn sản phẩm trước
                  khi thanh toán
                </p>
              </div>
            </div>

            <div className="buy-now-product">
              <img
                src={buyNowItem.image}
                alt={buyNowItem.name}
              />

              <div>
                <h3>{buyNowItem.name}</h3>

                <strong>
                  {formatPrice(buyNowItem.price)}
                </strong>
              </div>
            </div>

            {/* SIZE */}
            <div className="buy-option">
              <label>Size</label>

              <div className="option-list">
                {selectedProduct?.sizes.map((size) => (
                  <button
                    key={size}
                    className={
                      selectedSize === size
                        ? "option-button selected"
                        : "option-button"
                    }
                    onClick={() =>
                      setSelectedSize(size)
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* COLOR */}
            <div className="buy-option">
              <label>Màu sắc</label>

              <div className="option-list">
                {selectedProduct?.colors.map(
                  (color) => (
                    <button
                      key={color}
                      className={
                        selectedColor === color
                          ? "option-button selected"
                          : "option-button"
                      }
                      onClick={() =>
                        setSelectedColor(color)
                      }
                    >
                      {color}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* QUANTITY */}
            <div className="buy-option quantity-row">
              <label>Số lượng</label>

              <div className="quantity-control">
                <button
                  onClick={() =>
                    setQuantity((prev) =>
                      Math.max(1, prev - 1)
                    )
                  }
                >
                  −
                </button>

                <span>{quantity}</span>

                <button
                  onClick={() =>
                    setQuantity((prev) => prev + 1)
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className="buy-now-total">
              <span>Tạm tính</span>

              <strong>
                {formatPrice(
                  buyNowItem.price * quantity
                )}
              </strong>
            </div>

            <div className="buy-now-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  setShowBuyNow(false)
                }
              >
                Quay lại
              </button>

              <button
                className="buy-confirm-button"
                onClick={confirmBuyNow}
              >
                ⚡ Tiếp tục mua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CART MODAL ================= */}
      {showCart && (
        <div
          className="modal-overlay"
          onClick={() => setShowCart(false)}
        >
          <div
            className="cart-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowCart(false)}
            >
              ×
            </button>

            <div className="cart-header">
              <h2>🛒 Giỏ hàng</h2>

              <span>
                {cartCount} sản phẩm
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  🛒
                </div>

                <h3>Giỏ hàng đang trống</h3>

                <p>
                  Hãy thêm sản phẩm vào giỏ hàng.
                </p>

                <button
                  className="primary-button"
                  onClick={() => {
                    setShowCart(false);
                    scrollToProducts();
                  }}
                >
                  Xem sản phẩm
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div
                      className="cart-item"
                      key={`${item.id}-${item.size}-${item.color}-${index}`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                      />

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>

                        <p>
                          Size: {item.size} · Màu:{" "}
                          {item.color}
                        </p>

                        <strong>
                          {formatPrice(item.price)}
                        </strong>
                      </div>

                      <div className="cart-item-actions">
                        <div className="quantity-control small">
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                index,
                                item.quantity - 1
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateCartQuantity(
                                index,
                                item.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="remove-button"
                          onClick={() =>
                            removeFromCart(index)
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Tạm tính</span>

                    <strong>
                      {formatPrice(cartSubtotal)}
                    </strong>
                  </div>

                  <div className="summary-row">
                    <span>Phí vận chuyển</span>

                    <strong>
                      {cartSubtotal >= 500000
                        ? "Miễn phí"
                        : formatPrice(30000)}
                    </strong>
                  </div>

                  <div className="summary-total">
                    <span>Tổng cộng</span>

                    <strong>
                      {formatPrice(
                        cartSubtotal +
                          (cartSubtotal >= 500000
                            ? 0
                            : 30000)
                      )}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={checkoutFromCart}
                  >
                    🛍️ Đặt hàng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= CHECKOUT ================= */}
      {showCheckout && (
        <div
          className="modal-overlay"
          onClick={() => setShowCheckout(false)}
        >
          <div
            className="checkout-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowCheckout(false)}
            >
              ×
            </button>

            <div className="checkout-header">
              <span className="checkout-icon">
                🛍️
              </span>

              <div>
                <h2>
                  {checkoutSource === "buyNow"
                    ? "Mua ngay"
                    : "Đặt hàng"}
                </h2>

                <p>
                  Nhập thông tin để hoàn tất mua
                  hàng
                </p>
              </div>
            </div>

            <form onSubmit={createOrder}>
              <div className="checkout-layout">
                {/* CUSTOMER */}
                <div className="customer-form">
                  <h3>
                    👤 Thông tin khách hàng
                  </h3>

                  <div className="form-group">
                    <label>
                      Họ và tên *
                    </label>

                    <input
                      type="text"
                      name="name"
                      placeholder="Nhập họ và tên"
                      value={customer.name}
                      onChange={handleCustomerChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Số điện thoại *
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      placeholder="Nhập số điện thoại"
                      value={customer.phone}
                      onChange={handleCustomerChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Địa chỉ nhận hàng *
                    </label>

                    <textarea
                      name="address"
                      rows="3"
                      placeholder="Nhập địa chỉ nhận hàng"
                      value={customer.address}
                      onChange={handleCustomerChange}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label>
                      Ghi chú
                    </label>

                    <textarea
                      name="note"
                      rows="2"
                      placeholder="Ghi chú cho đơn hàng..."
                      value={customer.note}
                      onChange={handleCustomerChange}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label>
                      Phương thức thanh toán
                    </label>

                    <div className="payment-options">
                      <label
                        className={
                          customer.payment === "COD"
                            ? "payment-option active"
                            : "payment-option"
                        }
                      >
                        <input
                          type="radio"
                          name="payment"
                          value="COD"
                          checked={
                            customer.payment === "COD"
                          }
                          onChange={
                            handleCustomerChange
                          }
                        />

                        <span>
                          💵 Thanh toán khi nhận
                          hàng
                        </span>
                      </label>

                      <label
                        className={
                          customer.payment === "BANK"
                            ? "payment-option active"
                            : "payment-option"
                        }
                      >
                        <input
                          type="radio"
                          name="payment"
                          value="BANK"
                          checked={
                            customer.payment === "BANK"
                          }
                          onChange={
                            handleCustomerChange
                          }
                        />

                        <span>
                          🏦 Chuyển khoản
                        </span>
                      </label>
                    </div>

                    {customer.payment === "BANK" && (
                      <div className="bank-payment-preview">
                        <div className="bank-payment-preview-icon">🏦</div>

                        <div>
                          <strong>Thanh toán chuyển khoản</strong>
                          <p>
                            Sau khi xác nhận đặt hàng, hệ thống sẽ
                            cấp mã đơn và hiển thị QR thanh toán cùng
                            nội dung chuyển khoản tự động.
                          </p>

                          <div className="bank-preview-row">
                            <span>Ngân hàng</span>
                            <strong>
                              {BANK_TRANSFER_INFO.bankName}
                            </strong>
                          </div>

                          <div className="bank-preview-row">
                            <span>Số tài khoản</span>
                            <strong>
                              {BANK_TRANSFER_INFO.accountNumber}
                            </strong>
                          </div>

                          <small>
                            ⚠️ Đây là thông tin demo cho đồ án, không
                            dùng để chuyển tiền thật.
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ORDER */}
                <div className="order-review">
                  <h3>
                    📦 Kiểm tra đơn hàng
                  </h3>

                  <div className="checkout-items">
                    {checkoutItems.map(
                      (item, index) => (
                        <div
                          className="checkout-item"
                          key={`${item.id}-${index}`}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                          />

                          <div>
                            <h4>{item.name}</h4>

                            <p>
                              Size: {item.size}
                              <br />
                              Màu: {item.color}
                              <br />
                              Số lượng:{" "}
                              {item.quantity}
                            </p>
                          </div>

                          <strong>
                            {formatPrice(
                              item.price *
                                item.quantity
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>

                  <div className="checkout-coupon-box">
                    <div className="checkout-coupon-title">
                      <div>
                        <strong>🎟️ Mã giảm giá</strong>
                        <span>
                          Nhập voucher của ClothStore
                        </span>
                      </div>

                      {appliedCoupon && (
                        <span className="checkout-coupon-applied-badge">
                          Đã áp dụng
                        </span>
                      )}
                    </div>

                    <div className="checkout-coupon-form">
                      <input
                        type="text"
                        value={couponInput}
                        disabled={couponLoading || !!appliedCoupon}
                        placeholder="Ví dụ: SALE10"
                        maxLength="30"
                        onChange={(event) => {
                          setCouponInput(
                            event.target.value.toUpperCase()
                          );
                          setCouponError("");
                          setCouponMessage("");
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !appliedCoupon
                          ) {
                            event.preventDefault();
                            applyCoupon();
                          }
                        }}
                      />

                      {!appliedCoupon ? (
                        <button
                          type="button"
                          className="checkout-coupon-apply"
                          onClick={applyCoupon}
                          disabled={
                            couponLoading ||
                            !couponInput.trim()
                          }
                        >
                          {couponLoading
                            ? "Đang kiểm tra..."
                            : "Áp dụng"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="checkout-coupon-remove"
                          onClick={removeCoupon}
                        >
                          Bỏ mã
                        </button>
                      )}
                    </div>

                    {couponMessage && (
                      <div className="checkout-coupon-message success">
                        ✓ {couponMessage}
                      </div>
                    )}

                    {couponError && (
                      <div className="checkout-coupon-message error">
                        ⚠ {couponError}
                      </div>
                    )}

                    {appliedCoupon && (
                      <div className="checkout-coupon-detail">
                        <div>
                          <strong>{appliedCoupon.code}</strong>
                          <span>
                            {appliedCoupon.name ||
                              "Voucher ClothStore"}
                          </span>
                        </div>

                        <strong className="checkout-coupon-saving">
                          Tiết kiệm{" "}
                          {formatPrice(
                            couponDiscount +
                              couponShippingDiscount
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="checkout-summary">
                    <div>
                      <span>Tạm tính</span>

                      <strong>
                        {formatPrice(
                          checkoutSubtotal
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Phí vận chuyển
                      </span>

                      <strong>
                        {shippingFee === 0
                          ? "Miễn phí"
                          : formatPrice(
                              shippingFee
                            )}
                      </strong>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="checkout-discount-row">
                        <span>
                          Giảm giá
                          {appliedCoupon?.code
                            ? ` (${appliedCoupon.code})`
                            : ""}
                        </span>

                        <strong>
                          -{formatPrice(couponDiscount)}
                        </strong>
                      </div>
                    )}

                    {couponShippingDiscount > 0 && (
                      <div className="checkout-discount-row">
                        <span>Giảm phí vận chuyển</span>

                        <strong>
                          -
                          {formatPrice(
                            couponShippingDiscount
                          )}
                        </strong>
                      </div>
                    )}

                    <div className="checkout-total">
                      <span>Tổng thanh toán</span>

                      <strong>
                        {formatPrice(
                          checkoutTotal
                        )}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="checkout-submit"
                  >
                    {checkoutSource === "buyNow"
                      ? "⚡ Xác nhận mua"
                      : "🛍️ Xác nhận đặt hàng"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= AUTH ================= */}
      {showAuth && (
        <div
          className="modal-overlay"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="checkout-modal auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAuth(false)}
            >
              ×
            </button>

            <div className="checkout-header">
              <span className="checkout-icon">👤</span>

              <div>
                <h2>
                  {authMode === "login"
                    ? "Đăng nhập"
                    : "Đăng ký"}
                </h2>

                <p>
                  {authMode === "login"
                    ? "Đăng nhập để tiếp tục mua sắm"
                    : "Tạo tài khoản ClothStore"}
                </p>
              </div>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={
                  authMode === "login"
                    ? "auth-tab active"
                    : "auth-tab"
                }
                onClick={openLogin}
              >
                Đăng nhập
              </button>

              <button
                type="button"
                className={
                  authMode === "register"
                    ? "auth-tab active"
                    : "auth-tab"
                }
                onClick={openRegister}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <div className="form-group">
                  <label>Họ và tên *</label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Nhập họ và tên"
                    value={authForm.name}
                    onChange={handleAuthChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email *</label>

                <input
                  type="email"
                  name="email"
                  placeholder="Nhập email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu *</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={authForm.password}
                  onChange={handleAuthChange}
                />
              </div>

              <button
                type="submit"
                className="checkout-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "⏳ Đang xử lý..."
                  : authMode === "login"
                  ? "🔐 Đăng nhập"
                  : "✨ Tạo tài khoản"}
              </button>
            </form>

            {currentUser && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= ACCOUNT ================= */}
      {showAccount && currentUser && (
        <div
          className="modal-overlay"
          onClick={() => setShowAccount(false)}
        >
          <div
            className="account-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAccount(false)}
            >
              ×
            </button>

            <div className="account-header">
              <div className="account-avatar">👤</div>
              <div>
                <h2>{currentUser.name}</h2>
                <p>{currentUser.email}</p>
              </div>
            </div>

            <div className="account-section">
              <div className="account-section-title">
                <h3>📦 Lịch sử đơn hàng</h3>
                <button
                  type="button"
                  className="refresh-orders"
                  onClick={fetchMyOrders}
                  disabled={ordersLoading}
                >
                  {ordersLoading ? "Đang tải..." : "↻ Làm mới"}
                </button>
              </div>

              {ordersLoading && myOrders.length === 0 ? (
                <div className="orders-empty">
                  ⏳ Đang tải đơn hàng...
                </div>
              ) : ordersError ? (
                <div className="orders-empty orders-error">
                  ⚠️ {ordersError}
                </div>
              ) : myOrders.length === 0 ? (
                <div className="orders-empty">
                  <div className="orders-empty-icon">📦</div>
                  <strong>Chưa có đơn hàng</strong>
                  <p>Hãy chọn sản phẩm và đặt đơn hàng đầu tiên.</p>
                </div>
              ) : (
                <div className="orders-list">
                  {myOrders.map((order) => (
                    <div
                      className="order-card order-card-clickable"
                      key={order._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedOrder(order)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedOrder(order);
                        }
                      }}
                    >
                      <div className="order-card-top">
                        <div>
                          <span className="order-label">Mã đơn hàng</span>
                          <strong>{order.orderCode}</strong>
                        </div>
                        <span className={`order-status status-${getOrderStatusLabel(order.status).replaceAll(" ", "-")}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="order-date">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </div>

                      <div className="order-items">
                        {order.items.map((item, index) => (
                          <div className="order-item" key={`${order._id}-${index}`}>
                            <img
                              src={item.image || "https://via.placeholder.com/70x70?text=ClothStore"}
                              alt={item.name}
                            />
                            <div className="order-item-info">
                              <strong>{item.name}</strong>
                              <span>
                                Kích thước: {item.size || "-"} · Màu: {item.color || "-"}
                              </span>
                              <span>Số lượng: {item.quantity}</span>
                            </div>
                            <strong>{formatPrice(item.price * item.quantity)}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="customer-payment-row">
                        <span>Thanh toán</span>
                        <strong className={
                          (order.paymentStatus || "Chưa thanh toán") === "Đã thanh toán"
                            ? "customer-payment-paid"
                            : "customer-payment-unpaid"
                        }>
                          {(order.paymentStatus || "Chưa thanh toán") === "Đã thanh toán"
                            ? "✅ Đã thanh toán"
                            : "⏳ Chưa thanh toán"}
                        </strong>
                      </div>

                      <div className="order-total-row">
                        <span>Tổng tiền</span>
                        <strong>{formatPrice(order.total)}</strong>
                      </div>

                      <div className="order-card-detail-hint">
                        Xem chi tiết & theo dõi đơn hàng →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="secondary-button account-logout-button"
              onClick={handleLogout}
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAIL / TRACKING ================= */}
      {selectedOrder && (
        <div
          className="modal-overlay order-detail-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedOrder(null)}
            >
              ×
            </button>

            <div className="order-detail-header">
              <div>
                <span className="order-detail-eyebrow">
                  CHI TIẾT ĐƠN HÀNG
                </span>
                <h2>{selectedOrder.orderCode}</h2>
                <p>
                  Đặt lúc{" "}
                  {new Date(selectedOrder.createdAt).toLocaleString(
                    "vi-VN"
                  )}
                </p>
              </div>

              <span
                className={`order-status status-${getOrderStatusLabel(
                  selectedOrder.status
                ).replaceAll(" ", "-")}`}
              >
                {getOrderStatusLabel(selectedOrder.status)}
              </span>
            </div>

            {getOrderStatusLabel(selectedOrder.status) === "Đã hủy" ? (
              <div className="order-cancelled-box">
                <div>✕</div>
                <strong>Đơn hàng đã bị hủy</strong>
                <p>
                  Đơn hàng này không tiếp tục quá trình giao hàng.
                </p>
              </div>
            ) : (
              <div className="order-tracking">
                {ORDER_TRACKING_STEPS.map((step, index) => {
                  const progressIndex = getOrderProgressIndex(
                    selectedOrder.status
                  );
                  const completed = index <= progressIndex;
                  const current = index === progressIndex;

                  return (
                    <div
                      className={`tracking-step ${
                        completed ? "completed" : ""
                      } ${current ? "current" : ""}`}
                      key={step}
                    >
                      <div className="tracking-step-icon">
                        {index < progressIndex ? "✓" : index + 1}
                      </div>

                      <div className="tracking-step-content">
                        <strong>{step}</strong>
                        <small>
                          {step === "Chờ xác nhận" &&
                            "Shop đã tiếp nhận đơn hàng"}
                          {step === "Đã xác nhận" &&
                            "Đơn hàng đã được xác nhận"}
                          {step === "Đang giao" &&
                            "Đơn hàng đang trên đường giao"}
                          {step === "Đã giao" &&
                            "Khách hàng đã nhận được hàng"}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="order-detail-grid">
              <section className="order-detail-card">
                <h3>👤 Thông tin nhận hàng</h3>

                <div className="order-info-row">
                  <span>Người nhận</span>
                  <strong>
                    {selectedOrder.customer?.name || currentUser?.name || "-"}
                  </strong>
                </div>

                <div className="order-info-row">
                  <span>Số điện thoại</span>
                  <strong>
                    {selectedOrder.customer?.phone || "-"}
                  </strong>
                </div>

                <div className="order-info-row order-info-address">
                  <span>Địa chỉ</span>
                  <strong>
                    {selectedOrder.customer?.address || "-"}
                  </strong>
                </div>

                {selectedOrder.customer?.note && (
                  <div className="order-info-row order-info-address">
                    <span>Ghi chú</span>
                    <strong>{selectedOrder.customer.note}</strong>
                  </div>
                )}
              </section>

              <section className="order-detail-card">
                <h3>💳 Thanh toán</h3>

                <div className="order-payment-status-box">
                  <span>Trạng thái thanh toán</span>
                  <strong className={
                    (selectedOrder.paymentStatus || "Chưa thanh toán") === "Đã thanh toán"
                      ? "customer-payment-paid"
                      : "customer-payment-unpaid"
                  }>
                    {(selectedOrder.paymentStatus || "Chưa thanh toán") === "Đã thanh toán"
                      ? "✅ Đã thanh toán"
                      : "⏳ Chưa thanh toán"}
                  </strong>
                  {selectedOrder.paidAt && (
                    <small>
                      Xác nhận lúc {new Date(selectedOrder.paidAt).toLocaleString("vi-VN")}
                    </small>
                  )}
                </div>

                <div className="order-info-row">
                  <span>Phương thức</span>
                  <strong>
                    {selectedOrder.customer?.payment === "BANK"
                      ? "Chuyển khoản ngân hàng"
                      : "Thanh toán khi nhận hàng (COD)"}
                  </strong>
                </div>

                <div className="order-info-row">
                  <span>Tạm tính</span>
                  <strong>
                    {formatPrice(
                      Number(selectedOrder.subtotal || 0)
                    )}
                  </strong>
                </div>

                <div className="order-info-row">
                  <span>Phí vận chuyển</span>
                  <strong>
                    {Number(selectedOrder.shipping || 0) === 0
                      ? "Miễn phí"
                      : formatPrice(
                          Number(selectedOrder.shipping || 0)
                        )}
                  </strong>
                </div>

                <div className="order-info-row order-info-total">
                  <span>Tổng cộng</span>
                  <strong>
                    {formatPrice(Number(selectedOrder.total || 0))}
                  </strong>
                </div>
              </section>
            </div>

            <section className="order-detail-products">
              <div className="order-detail-products-title">
                <h3>🛍️ Sản phẩm đã đặt</h3>
                <span>
                  {(selectedOrder.items || []).reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0
                  )}{" "}
                  sản phẩm
                </span>
              </div>

              <div className="order-detail-item-list">
                {(selectedOrder.items || []).map((item, index) => (
                  <div
                    className="order-detail-item"
                    key={`${selectedOrder._id}-${index}`}
                  >
                    <img
                      src={
                        item.image ||
                        "https://via.placeholder.com/80x80?text=ClothStore"
                      }
                      alt={item.name}
                    />

                    <div className="order-detail-item-info">
                      <strong>{item.name}</strong>
                      <span>
                        Size: {item.size || "-"} · Màu:{" "}
                        {item.color || "-"}
                      </span>
                      <span>Số lượng: {item.quantity}</span>
                    </div>

                    <strong className="order-detail-item-price">
                      {formatPrice(
                        Number(item.price || 0) *
                          Number(item.quantity || 0)
                      )}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            {getOrderStatusLabel(selectedOrder.status) ===
              "Chờ xác nhận" &&
              (selectedOrder.paymentStatus ||
                "Chưa thanh toán") !==
                "Đã thanh toán" && (
                <div className="customer-cancel-note">
                  <div>
                    <strong>Muốn thay đổi đơn hàng?</strong>
                    <p>
                      Bạn chỉ có thể tự hủy khi đơn vẫn đang
                      ở trạng thái Chờ xác nhận.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="customer-cancel-order-button"
                    disabled={cancellingOrder}
                    onClick={() =>
                      cancelMyOrder(selectedOrder)
                    }
                  >
                    {cancellingOrder
                      ? "⏳ Đang hủy..."
                      : "✕ Hủy đơn hàng"}
                  </button>
                </div>
              )}

            <div className="order-detail-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedOrder(null)}
              >
                ← Quay lại lịch sử đơn hàng
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  await fetchMyOrders();

                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/orders/${selectedOrder._id}`,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );

                    const data = await response.json();

                    if (response.ok && data.success) {
                      setSelectedOrder(data.order);
                    }
                  } catch (error) {
                    console.error(
                      "Refresh selected order error:",
                      error
                    );
                  }
                }}
                disabled={ordersLoading}
              >
                {ordersLoading
                  ? "Đang cập nhật..."
                  : "↻ Cập nhật trạng thái"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS ================= */}
      {showSuccess && (
        <div
          className="modal-overlay"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className={`success-modal ${
              lastPaymentMethod === "BANK"
                ? "success-modal-bank"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="success-icon">
              ✓
            </div>

            <h2>
              {successSource === "buyNow"
                ? "Mua hàng thành công!"
                : "Đặt hàng thành công!"}
            </h2>

            <p>
              Cảm ơn bạn đã mua hàng tại
              ClothStore.
            </p>

            <div className="success-info">
              <div>
                <span>Mã đơn hàng</span>

                <strong>{orderCode}</strong>
              </div>

              <div>
                <span>Khách hàng</span>

                <strong>
                  {customer.name}
                </strong>
              </div>

              <div>
                <span>Trạng thái</span>

                <strong className="status">
                  Chờ xác nhận
                </strong>
              </div>
            </div>

            {lastPaymentMethod === "BANK" && (
              <div className="bank-success-card">
                <div className="bank-success-heading">
                  <div>
                    <span>THANH TOÁN CHUYỂN KHOẢN</span>
                    <h3>Quét QR để thanh toán</h3>
                  </div>

                  <span className="bank-demo-badge">
                    DEMO
                  </span>
                </div>

                <div className="bank-success-layout">
                  <div className="bank-qr-box">
                    <img
                      src={getDemoQrUrl(
                        orderCode,
                        lastOrderTotal
                      )}
                      alt={`QR thanh toán đơn ${orderCode}`}
                    />
                    <small>
                      QR mô phỏng phục vụ đồ án
                    </small>
                  </div>

                  <div className="bank-transfer-details">
                    <div>
                      <span>Ngân hàng</span>
                      <strong>
                        {BANK_TRANSFER_INFO.bankName}
                      </strong>
                    </div>

                    <div>
                      <span>Chủ tài khoản</span>
                      <strong>
                        {BANK_TRANSFER_INFO.accountName}
                      </strong>
                    </div>

                    <div>
                      <span>Số tài khoản</span>
                      <strong>
                        {BANK_TRANSFER_INFO.accountNumber}
                      </strong>
                    </div>

                    <div>
                      <span>Số tiền</span>
                      <strong className="bank-transfer-amount">
                        {formatPrice(lastOrderTotal)}
                      </strong>
                    </div>

                    <div>
                      <span>Nội dung</span>
                      <div className="bank-transfer-content">
                        <strong>
                          {getTransferContent(orderCode)}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            copyTransferContent(orderCode)
                          }
                        >
                          📋 Sao chép
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="bank-demo-note">
                  ⚠️ QR và tài khoản hiện tại chỉ dùng minh họa cho
                  đồ án. Không chuyển tiền thật vào thông tin này.
                </p>
              </div>
            )}

            <button
              className="primary-button"
              onClick={() =>
                setShowSuccess(false)
              }
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      )}

      {/* ================= AI CHAT ================= */}
      <AIChat
  onViewProduct={(aiProduct) => {
    const productId =
      aiProduct.id ||
      aiProduct._id;

    const realProduct =
      products.find(
        (item) =>
          item.id ===
            productId ||
          item._id ===
            productId
      ) ||
      aiProduct;

    openProduct({
      ...realProduct,

      id:
        realProduct.id ||
        realProduct._id,

      sizes:
        realProduct.sizes ||
        [],

      colors:
        realProduct.colors ||
        [],
    });
  }}
/>
    </div>
  );
}

export default App;