import { useEffect, useRef, useState } from "react";
import "./AIChat.css";

const API_BASE_URL = "http://localhost:5000/api";

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("vi-VN") + " ₫";

export default function AIChat({
  onViewProduct,
}) {
  // =====================================================
  // STATE
  // =====================================================
  const [open, setOpen] = useState(false);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const bodyRef = useRef(null);

  const [messages, setMessages] =
    useState([
      {
        role: "assistant",

        content:
          "Xin chào! 👋 Mình là trợ lý tư vấn miễn phí của ClothStore. Bạn muốn tìm sản phẩm theo loại, màu, size hay ngân sách?",

        products: [],
      },
    ]);

  // =====================================================
  // TỰ ĐỘNG CUỘN XUỐNG TIN NHẮN MỚI
  // =====================================================
  useEffect(() => {
    if (
      !open ||
      !bodyRef.current
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        bodyRef.current.scrollTop =
          bodyRef.current.scrollHeight;
      }, 50);

    return () =>
      clearTimeout(timer);
  }, [
    messages,
    loading,
    open,
  ]);

  // =====================================================
  // GỬI CÂU HỎI CHO BACKEND
  // =====================================================
  const sendText =
    async (value) => {
      const text =
        String(
          value || ""
        ).trim();

      if (
        !text ||
        loading
      ) {
        return;
      }

      const userMessage = {
        role: "user",

        content: text,

        products: [],
      };

      const nextMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        nextMessages
      );

      setMessage("");

      setLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/ai/chat`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                message: text,

                // Gửi lịch sử hội thoại
                history: messages
                  .slice(-8)
                  .map(
                    (item) => ({
                      role:
                        item.role,

                      content:
                        item.content,
                    })
                  ),
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Trợ lý hiện không thể trả lời."
          );
        }

        // ================================================
        // THÊM CÂU TRẢ LỜI AI
        // ================================================
        const aiMessage = {
          role: "assistant",

          content:
            data.message,

          products:
            Array.isArray(
              data.products
            )
              ? data.products
              : [],
        };

        setMessages([
          ...nextMessages,

          aiMessage,
        ]);
      } catch (error) {
        setMessages([
          ...nextMessages,

          {
            role:
              "assistant",

            content:
              `⚠️ ${error.message}`,

            products: [],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // SUBMIT FORM
  // =====================================================
  const sendMessage =
    async (event) => {
      event.preventDefault();

      await sendText(
        message
      );
    };

  // =====================================================
  // CÂU HỎI NHANH
  // =====================================================
  const quickQuestions = [
    "Tư vấn đồ dưới 500.000đ",

    "Tôi muốn tìm áo màu đen",

    "Có quần size 30 không?",
  ];

  // =====================================================
  // MỞ SẢN PHẨM TỪ AI
  // =====================================================
  const handleViewProduct =
    (product) => {
      // Kiểm tra App.jsx có truyền hàm xuống không
      if (
        typeof onViewProduct ===
        "function"
      ) {
        // Đóng chatbot
        setOpen(false);

        // Mở modal sản phẩm chính
        setTimeout(() => {
          onViewProduct(
            product
          );
        }, 100);

        return;
      }

      // ================================================
      // FALLBACK
      // Nếu chưa kết nối App.jsx
      // thì cuộn xuống sản phẩm
      // ================================================
      setOpen(false);

      setTimeout(() => {
        const section =
          document.querySelector(
            "#products"
          );

        if (section) {
          section.scrollIntoView(
            {
              behavior:
                "smooth",

              block:
                "start",
            }
          );
        } else {
          window.location.hash =
            "products";
        }
      }, 100);
    };

  // =====================================================
  // THÊM VÀO GIỎ
  //
  // Không thêm thẳng ngay vì sản phẩm cần chọn:
  // - size
  // - màu
  // - số lượng
  //
  // Vì vậy mở modal sản phẩm chính.
  // Người dùng chọn xong rồi bấm:
  // "Thêm vào giỏ hàng"
  // =====================================================
  const handleAddToCart =
    (product) => {
      if (
        typeof onViewProduct ===
        "function"
      ) {
        setOpen(false);

        setTimeout(() => {
          onViewProduct(
            product
          );
        }, 100);

        return;
      }

      handleViewProduct(
        product
      );
    };

  // =====================================================
  // XÓA LỊCH SỬ CHAT
  // =====================================================
  const clearChat = () => {
    setMessages([
      {
        role:
          "assistant",

        content:
          "Đã bắt đầu cuộc tư vấn mới ✨ Bạn muốn tìm áo, quần, áo khoác hay muốn tư vấn theo ngân sách?",

        products: [],
      },
    ]);

    setMessage("");
  };

  // =====================================================
  // GIAO DIỆN
  // =====================================================
  return (
    <>
      {/* ============================================= */}
      {/* NÚT AI NỔI */}
      {/* ============================================= */}

      <button
        type="button"
        className="ai-floating-button cloth-ai-floating-button"
        onClick={() =>
          setOpen(true)
        }
      >
        <span>✨</span>

        <span>
          AI tư vấn
        </span>
      </button>

      {/* ============================================= */}
      {/* CHATBOT */}
      {/* ============================================= */}

      {open && (
        <div
          className="cloth-ai-overlay"
          onClick={() =>
            setOpen(false)
          }
        >
          <div
            className="cloth-ai-container"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            {/* ===================================== */}
            {/* HEADER */}
            {/* ===================================== */}

            <div className="cloth-ai-header">
              <div className="cloth-ai-title">
                <div className="cloth-ai-avatar">
                  ✨
                </div>

                <div>
                  <h3>
                    ClothStore AI
                  </h3>

                  <p>
                    Tư vấn miễn phí từ dữ liệu cửa hàng
                  </p>
                </div>
              </div>

              <div className="cloth-ai-header-actions">
                {/* XÓA CHAT */}

                <button
                  type="button"
                  className="cloth-ai-clear"
                  onClick={
                    clearChat
                  }
                  title="Bắt đầu tư vấn mới"
                >
                  ↻
                </button>

                {/* ĐÓNG */}

                <button
                  type="button"
                  className="cloth-ai-close"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  title="Đóng"
                >
                  ×
                </button>
              </div>
            </div>

            {/* ===================================== */}
            {/* BODY */}
            {/* ===================================== */}

            <div
              className="cloth-ai-body"
              ref={bodyRef}
            >
              {messages.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`cloth-ai-message ${
                      item.role ===
                      "user"
                        ? "cloth-ai-user"
                        : "cloth-ai-assistant"
                    }`}
                  >
                    <div className="cloth-ai-message-content">
                      {/* ============================ */}
                      {/* NỘI DUNG CHAT */}
                      {/* ============================ */}

                      <div className="cloth-ai-bubble">
                        {
                          item.content
                        }
                      </div>

                      {/* ============================ */}
                      {/* SẢN PHẨM AI GỢI Ý */}
                      {/* ============================ */}

                      {item.role ===
                        "assistant" &&
                        item
                          .products
                          ?.length >
                          0 && (
                          <div className="cloth-ai-products">
                            {item.products.map(
                              (
                                product
                              ) => (
                                <article
                                  className="cloth-ai-product-card"
                                  key={
                                    product._id ||
                                    product.id ||
                                    product.name
                                  }
                                >
                                  {/* ================= */}
                                  {/* ẢNH */}
                                  {/* ================= */}

                                  <div className="cloth-ai-product-image-wrap">
                                    {product.image ? (
                                      <img
                                        src={
                                          product.image
                                        }
                                        alt={
                                          product.name
                                        }
                                        className="cloth-ai-product-image"
                                      />
                                    ) : (
                                      <div className="cloth-ai-product-placeholder">
                                        👕
                                      </div>
                                    )}
                                  </div>

                                  {/* ================= */}
                                  {/* THÔNG TIN */}
                                  {/* ================= */}

                                  <div className="cloth-ai-product-info">
                                    <h4>
                                      {
                                        product.name
                                      }
                                    </h4>

                                    <p className="cloth-ai-product-price">
                                      {formatPrice(
                                        product.price
                                      )}
                                    </p>

                                    {/* ================= */}
                                    {/* META */}
                                    {/* ================= */}

                                    <div className="cloth-ai-product-meta">
                                      {product.category && (
                                        <span>
                                          {
                                            product.category
                                          }
                                        </span>
                                      )}

                                      {typeof product.stock ===
                                        "number" && (
                                        <span>
                                          Còn{" "}
                                          {
                                            product.stock
                                          }
                                        </span>
                                      )}
                                    </div>

                                    {/* ================= */}
                                    {/* MÀU */}
                                    {/* ================= */}

                                    {product
                                      .colors
                                      ?.length >
                                      0 && (
                                      <p className="cloth-ai-product-detail">
                                        🎨 Màu:{" "}
                                        {product.colors.join(
                                          ", "
                                        )}
                                      </p>
                                    )}

                                    {/* ================= */}
                                    {/* SIZE */}
                                    {/* ================= */}

                                    {product
                                      .sizes
                                      ?.length >
                                      0 && (
                                      <p className="cloth-ai-product-detail">
                                        📏 Size:{" "}
                                        {product.sizes.join(
                                          ", "
                                        )}
                                      </p>
                                    )}

                                    {/* ================= */}
                                    {/* BUTTONS */}
                                    {/* ================= */}

                                    <div className="cloth-ai-product-actions">
                                      <button
                                        type="button"
                                        className="cloth-ai-view-button"
                                        onClick={() =>
                                          handleViewProduct(
                                            product
                                          )
                                        }
                                      >
                                        👁 Xem
                                      </button>

                                      <button
                                        type="button"
                                        className="cloth-ai-cart-button"
                                        onClick={() =>
                                          handleAddToCart(
                                            product
                                          )
                                        }
                                      >
                                        🛒 Thêm giỏ
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )
              )}

              {/* ===================================== */}
              {/* LOADING */}
              {/* ===================================== */}

              {loading && (
                <div className="cloth-ai-message cloth-ai-assistant">
                  <div className="cloth-ai-bubble cloth-ai-loading">
                    <span></span>

                    <span></span>

                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================== */}
            {/* CÂU HỎI NHANH */}
            {/* ===================================== */}

            <div className="cloth-ai-quick">
              {quickQuestions.map(
                (
                  question
                ) => (
                  <button
                    key={
                      question
                    }
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      sendText(
                        question
                      )
                    }
                  >
                    {
                      question
                    }
                  </button>
                )
              )}
            </div>

            {/* ===================================== */}
            {/* FORM CHAT */}
            {/* ===================================== */}

            <form
              className="cloth-ai-form"
              onSubmit={
                sendMessage
              }
            >
              <input
                type="text"
                value={
                  message
                }
                onChange={(
                  event
                ) =>
                  setMessage(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Ví dụ: Tôi cần áo đen dưới 300.000đ..."
                disabled={
                  loading
                }
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !message.trim()
                }
              >
                {loading
                  ? "..."
                  : "Gửi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}