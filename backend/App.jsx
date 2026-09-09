import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:5000/api";

const formatPrice = (price) =>
  price.toLocaleString("vi-VN") + " ₫";

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

function App() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

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

  const [orderCode, setOrderCode] = useState("");
  const [successSource, setSuccessSource] = useState("");

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

        setProducts(data.products || []);
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

  const checkoutTotal = checkoutSubtotal + shippingFee;

  // Mở sản phẩm
  const openProduct = (product) => {
    setSelectedProduct(product);

    setSelectedSize(product.sizes[0]);
    setSelectedColor(product.colors[0]);
    setQuantity(1);
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

  // Tạo mã đơn hàng
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

  // Xác nhận mua / đặt hàng
  const createOrder = (event) => {
    event.preventDefault();

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

    const code = generateOrderCode();

    const newOrder = {
      orderCode: code,
      customer,
      items: checkoutItems,
      subtotal: checkoutSubtotal,
      shipping: shippingFee,
      total: checkoutTotal,
      status: "Chờ xác nhận",
      createdAt: new Date().toISOString(),
      source: checkoutSource,
    };

    // Lưu đơn hàng
    const oldOrders = JSON.parse(
      localStorage.getItem("clothstore_orders") || "[]"
    );

    localStorage.setItem(
      "clothstore_orders",
      JSON.stringify([...oldOrders, newOrder])
    );

    // Nếu mua từ giỏ thì xóa các sản phẩm đã thanh toán
    if (checkoutSource === "cart") {
      setCart([]);
    }

    setOrderCode(code);
    setSuccessSource(checkoutSource);
    setShowCheckout(false);
    setShowSuccess(true);

    // Reset
    setCheckoutItems([]);
    setCheckoutSource("");
  };

  // Cuộn đến sản phẩm
  const scrollToProducts = () => {
    document
      .getElementById("products")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <div className="app">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">👕</span>
          <span>ClothStore</span>
        </div>

        <nav className="nav">
          <a href="#home">Trang chủ</a>
          <a href="#products">Sản phẩm</a>
          <a href="#ai">AI tư vấn</a>
          <a href="#about">Giới thiệu</a>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            onClick={scrollToProducts}
            title="Tìm kiếm"
          >
            🔍
          </button>

          <button
            className="icon-button"
            onClick={() =>
              alert(
                "Chức năng tài khoản sẽ được phát triển ở bước tiếp theo."
              )
            }
            title="Tài khoản"
          >
            👤
          </button>

          <button
            className="cart-button"
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
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-badge">
            ✨ Thời trang hiện đại
          </span>

          <h1>
            Mặc đẹp hơn
            <br />
            <span>mỗi ngày</span>
          </h1>

          <p>
            Khám phá bộ sưu tập thời trang mới nhất
            và nhận tư vấn thông minh từ AI.
          </p>

          <button
            className="primary-button"
            onClick={scrollToProducts}
          >
            Khám phá sản phẩm →
          </button>
        </div>

        <div className="hero-image">
          <div className="hero-card">
            <div className="hero-shirt">👕</div>
            <div className="hero-circle circle-1"></div>
            <div className="hero-circle circle-2"></div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORY ================= */}
      <section className="category-section">
        <div className="section-heading">
          <span>Danh mục</span>
          <h2>Khám phá theo phong cách</h2>
        </div>

        <div className="category-list">
          {categories.map((category) => (
            <button
              key={category}
              className={
                selectedCategory === category
                  ? "category-button active"
                  : "category-button"
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category === "Tất cả" && "✨ "}
              {category === "Áo" && "👕 "}
              {category === "Quần" && "👖 "}
              {category === "Áo khoác" && "🧥 "}
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section className="products-section" id="products">
        <div className="section-heading">
          <span>Bộ sưu tập</span>
          <h2>Sản phẩm nổi bật</h2>
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
              alert(
                "Tính năng AI tư vấn sẽ được kết nối OpenAI ở bước backend."
              )
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

              <p className="modal-description">
                {selectedProduct.description}
              </p>

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
                    onClick={() =>
                      setQuantity((prev) => prev + 1)
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
                  onClick={addToCart}
                >
                  🛒 Thêm vào giỏ hàng
                </button>

                <button
                  className="buy-now-large"
                  onClick={openBuyNow}
                >
                  ⚡ Mua ngay
                </button>
              </div>
            </div>
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

      {/* ================= SUCCESS ================= */}
      {showSuccess && (
        <div
          className="modal-overlay"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="success-modal"
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
    </div>
  );
}

export default App;