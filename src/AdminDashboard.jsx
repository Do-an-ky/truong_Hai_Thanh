import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./AdminDashboard.css";
import AdminCharts from "./AdminCharts";

const API_BASE_URL =
  "http://localhost:5000/api";

// =====================================================
// FORMAT GIÁ
// =====================================================
const formatPrice = (price) =>
  Number(price || 0).toLocaleString("vi-VN") +
  " ₫";

// =====================================================
// FORMAT NGÀY
// =====================================================
const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

// =====================================================
// TRẠNG THÁI ĐƠN HÀNG
// =====================================================
const STATUS_OPTIONS = [
  {
    value: "Chờ xác nhận",
    label: "Chờ xác nhận",
  },
  {
    value: "Đã xác nhận",
    label: "Đã xác nhận",
  },
  {
    value: "Đang giao",
    label: "Đang giao",
  },
  {
    value: "Đã giao",
    label: "Đã giao",
  },
  {
    value: "Đã hủy",
    label: "Đã hủy",
  },
];

// =====================================================
// CHUẨN HÓA TRẠNG THÁI CŨ
// =====================================================
const statusLabel = (status) => {
  const map = {
    "Chờ xác nhận": "Chờ xác nhận",
    "Đã xác nhận": "Đã xác nhận",
    "Đang giao": "Đang giao",
    "Đã giao": "Đã giao",
    "Đã hủy": "Đã hủy",

    pending: "Chờ xác nhận",
    processing: "Đã xác nhận",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",

    "Trâu xác nhận":
      "Chờ xác nhận",
  };

  return (
    map[status] ||
    status ||
    "Chờ xác nhận"
  );
};

// =====================================================
// FORM SẢN PHẨM MẶC ĐỊNH
// =====================================================
const emptyProduct = {
  name: "",
  price: "",
  category: "Áo",
  image: "",
  sizes: "S, M, L, XL",
  colors: "Đen, Trắng",
  description: "",
  stock: 100,
};


// =====================================================
// FORM VOUCHER MẶC ĐỊNH
// =====================================================
const emptyCoupon = {
  code: "",
  name: "",
  type: "PERCENT",
  value: 10,
  minOrder: 0,
  maxDiscount: 0,
  startDate: "",
  endDate: "",
  usageLimit: 0,
  active: true,
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// =====================================================
// COMPONENT
// =====================================================
export default function AdminDashboard({
  token,
  onClose,
}) {
  // ===================================================
  // TAB
  // ===================================================
  const [tab, setTab] =
    useState("overview");

  // ===================================================
  // DATA
  // ===================================================
  const [products, setProducts] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [selectedAdminOrder, setSelectedAdminOrder] =
    useState(null);

  const [customers, setCustomers] =
    useState([]);


  // ===================================================
  // VOUCHERS
  // ===================================================
  const [coupons, setCoupons] =
    useState([]);

  const [couponSearch, setCouponSearch] =
    useState("");

  const [showCouponForm, setShowCouponForm] =
    useState(false);

  const [editingCouponId, setEditingCouponId] =
    useState(null);

  const [couponForm, setCouponForm] =
    useState(emptyCoupon);

  const [savingCoupon, setSavingCoupon] =
    useState(false);


  // ===================================================
  // MAINTENANCE
  // ===================================================
  const [maintenanceForm, setMaintenanceForm] =
    useState({
      enabled: false,
      title: "Hệ thống đang bảo trì",
      message:
        "ClothStore đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.",
      estimatedEnd: "",
    });

  const [maintenanceSaving, setMaintenanceSaving] =
    useState(false);

  const [maintenanceLoaded, setMaintenanceLoaded] =
    useState(false);
  // ===================================================
  // LOADING / MESSAGE
  // ===================================================
  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ===================================================
  // PRODUCT FORM
  // ===================================================
  const [
    showProductForm,
    setShowProductForm,
  ] = useState(false);

  const [
    editingProductId,
    setEditingProductId,
  ] = useState(null);

  const [
    productForm,
    setProductForm,
  ] = useState(emptyProduct);

  const [
    savingProduct,
    setSavingProduct,
  ] = useState(false);

  const [imageFileName, setImageFileName] = useState("");

  // ===================================================
  // PRODUCT FILTERS
  // ===================================================
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [productSort, setProductSort] = useState("default");

  // ===================================================
  // CUSTOMER SEARCH
  // ===================================================
  const [
    customerSearch,
    setCustomerSearch,
  ] = useState("");

  // ===================================================
  // ORDER SEARCH
  // ===================================================
  const [
    orderSearch,
    setOrderSearch,
  ] = useState("");

  // ===================================================
  // ORDER FILTERS
  // ===================================================
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [orderSort, setOrderSort] = useState("newest");

  // ===================================================
  // AUTH HEADER
  // ===================================================
  const authHeaders = useMemo(
    () => ({
      "Content-Type":
        "application/json",

      Authorization:
        `Bearer ${token}`,
    }),
    [token]
  );

  const loadMaintenanceSettings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/admin`,
        {
          headers: authHeaders,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Không thể tải cài đặt bảo trì"
        );
      }

      setMaintenanceForm({
        enabled: Boolean(
          data.maintenance?.enabled
        ),
        title:
          data.maintenance?.title ||
          "Hệ thống đang bảo trì",
        message:
          data.maintenance?.message ||
          "ClothStore đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.",
        estimatedEnd:
          data.maintenance?.estimatedEnd
            ? new Date(
                data.maintenance.estimatedEnd
              )
                .toISOString()
                .slice(0, 16)
            : "",
      });

      setMaintenanceLoaded(true);
    } catch (err) {
      console.error(
        "Load maintenance error:",
        err
      );
    }
  };

  const saveMaintenanceSettings = async () => {
    setMaintenanceSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/maintenance`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            enabled:
              maintenanceForm.enabled,
            title:
              maintenanceForm.title.trim(),
            message:
              maintenanceForm.message.trim(),
            estimatedEnd:
              maintenanceForm.estimatedEnd ||
              null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Không thể lưu chế độ bảo trì"
        );
      }

      setMaintenanceForm({
        enabled: Boolean(
          data.maintenance?.enabled
        ),
        title:
          data.maintenance?.title ||
          "Hệ thống đang bảo trì",
        message:
          data.maintenance?.message ||
          "",
        estimatedEnd:
          data.maintenance?.estimatedEnd
            ? new Date(
                data.maintenance.estimatedEnd
              )
                .toISOString()
                .slice(0, 16)
            : "",
      });

      setMessage(
        data.maintenance?.enabled
          ? "🛠️ Đã bật chế độ bảo trì. Khách hàng sẽ thấy trang bảo trì."
          : "✅ Đã tắt chế độ bảo trì. Website hoạt động bình thường."
      );
    } catch (err) {
      setError(
        err.message ||
          "Không thể lưu chế độ bảo trì"
      );
    } finally {
      setMaintenanceSaving(false);
    }
  };

  // ===================================================
  // LOAD TẤT CẢ DATA ADMIN
  // ===================================================
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        productRes,
        orderRes,
        customerRes,
        couponRes,
      ] = await Promise.all([
        // SẢN PHẨM
        fetch(
          `${API_BASE_URL}/products`
        ),

        // ĐƠN HÀNG
        fetch(
          `${API_BASE_URL}/orders`,
          {
            headers:
              authHeaders,
          }
        ),

        // KHÁCH HÀNG
        fetch(
          `${API_BASE_URL}/users/admin/all`,
          {
            headers:
              authHeaders,
          }
        ),

        // VOUCHER
        fetch(
          `${API_BASE_URL}/coupons`,
          {
            headers:
              authHeaders,
          }
        ),
      ]);

      const productData =
        await productRes.json();

      const orderData =
        await orderRes.json();

      const customerData =
        await customerRes.json();


      const couponData =
        await couponRes.json();

      // ===============================================
      // KIỂM TRA RESPONSE
      // ===============================================
      if (!productRes.ok) {
        throw new Error(
          productData.message ||
            "Không thể tải sản phẩm"
        );
      }

      if (!orderRes.ok) {
        throw new Error(
          orderData.message ||
            "Không thể tải đơn hàng"
        );
      }

      if (!customerRes.ok) {
        throw new Error(
          customerData.message ||
            "Không thể tải khách hàng"
        );
      }


      if (!couponRes.ok) {
        throw new Error(
          couponData.message ||
            "Không thể tải voucher"
        );
      }

      // ===============================================
      // SET DATA
      // ===============================================
      setProducts(
        productData.products ||
          []
      );

      setOrders(
        orderData.orders || []
      );

      setCustomers(
        customerData.users || []
      );


      setCoupons(
        couponData.coupons || []
      );
    } catch (err) {
      console.error(
        "Admin load data error:",
        err
      );

      setError(
        err.message ||
          "Không thể tải dữ liệu quản trị"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // LOAD KHI TOKEN THAY ĐỔI
  // ===================================================
  useEffect(() => {
    if (token) {
      loadData();
      loadMaintenanceSettings();
    }
  }, [token]);

  // ===================================================
  // THỐNG KÊ
  // ===================================================

  const totalRevenue =
    orders
      .filter(
        (order) =>
          statusLabel(
            order.status
          ) === "Đã giao"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.total || 0
          ),
        0
      );

  const pendingOrders =
    orders.filter(
      (order) =>
        statusLabel(
          order.status
        ) ===
        "Chờ xác nhận"
    ).length;

  const confirmedOrders =
    orders.filter(
      (order) =>
        statusLabel(
          order.status
        ) === "Đã xác nhận"
    ).length;

  const shippingOrders =
    orders.filter(
      (order) =>
        statusLabel(
          order.status
        ) === "Đang giao"
    ).length;

  const deliveredOrders =
    orders.filter(
      (order) =>
        statusLabel(
          order.status
        ) === "Đã giao"
    ).length;

  const cancelledOrders =
    orders.filter(
      (order) =>
        statusLabel(
          order.status
        ) === "Đã hủy"
    ).length;

  const stockTotal =
    products.reduce(
      (sum, product) =>
        sum +
        Number(
          product.stock || 0
        ),
      0
    );

  const lowStockProducts =
    products.filter(
      (product) =>
        Number(
          product.stock || 0
        ) <= 10
    );

  const productCategories = useMemo(
    () =>
      [...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "vi")),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();

    const result = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const category = String(product.category || "").toLowerCase();
      const description = String(product.description || "").toLowerCase();
      const stock = Number(product.stock || 0);

      const matchesSearch =
        !keyword ||
        name.includes(keyword) ||
        category.includes(keyword) ||
        description.includes(keyword);

      const matchesCategory =
        productCategoryFilter === "all" ||
        product.category === productCategoryFilter;

      let matchesStock = true;
      if (productStockFilter === "out") matchesStock = stock <= 0;
      if (productStockFilter === "low") matchesStock = stock > 0 && stock <= 10;
      if (productStockFilter === "available") matchesStock = stock > 10;

      return matchesSearch && matchesCategory && matchesStock;
    });

    return [...result].sort((a, b) => {
      if (productSort === "price-asc") {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (productSort === "price-desc") {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (productSort === "stock-asc") {
        return Number(a.stock || 0) - Number(b.stock || 0);
      }
      if (productSort === "stock-desc") {
        return Number(b.stock || 0) - Number(a.stock || 0);
      }
      if (productSort === "name-asc") {
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      }
      return 0;
    });
  }, [
    products,
    productSearch,
    productCategoryFilter,
    productStockFilter,
    productSort,
  ]);

  const outOfStockCount = products.filter(
    (product) => Number(product.stock || 0) <= 0
  ).length;

  const lowOnlyStockCount = products.filter((product) => {
    const stock = Number(product.stock || 0);
    return stock > 0 && stock <= 10;
  }).length;

  const resetProductFilters = () => {
    setProductSearch("");
    setProductCategoryFilter("all");
    setProductStockFilter("all");
    setProductSort("default");
  };

  // Chỉ tính role user là khách hàng
  const normalCustomers =
    customers.filter(
      (customer) =>
        customer.role !== "admin"
    );

  const adminCount =
    customers.filter(
      (customer) =>
        customer.role === "admin"
    ).length;

  // ===================================================
  // LỌC KHÁCH HÀNG
  // ===================================================
  const filteredCustomers =
    customers.filter(
      (customer) => {
        const keyword =
          customerSearch
            .trim()
            .toLowerCase();

        if (!keyword) {
          return true;
        }

        const name =
          String(
            customer.name || ""
          ).toLowerCase();

        const email =
          String(
            customer.email || ""
          ).toLowerCase();

        return (
          name.includes(keyword) ||
          email.includes(keyword)
        );
      }
    );

  // ===================================================
  // LỌC VOUCHER
  // ===================================================
  const filteredCoupons = useMemo(() => {
    const keyword = couponSearch.trim().toLowerCase();

    return coupons.filter((coupon) => {
      if (!keyword) return true;

      return (
        String(coupon.code || "")
          .toLowerCase()
          .includes(keyword) ||
        String(coupon.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(coupon.type || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [coupons, couponSearch]);

  const activeCouponCount =
    coupons.filter((coupon) => coupon.active).length;

  const usedCouponCount =
    coupons.reduce(
      (sum, coupon) =>
        sum + Number(coupon.usedCount || 0),
      0
    );

  // ===================================================
  // LỌC + SẮP XẾP ĐƠN HÀNG
  // ===================================================
  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();

    const result = orders.filter((order) => {
      const orderCode = String(order.orderCode || "").toLowerCase();
      const customerName = String(
        order.customer?.name || order.user?.name || ""
      ).toLowerCase();
      const phone = String(order.customer?.phone || "").toLowerCase();
      const email = String(order.user?.email || "").toLowerCase();
      const address = String(order.customer?.address || "").toLowerCase();

      const matchesKeyword =
        !keyword ||
        orderCode.includes(keyword) ||
        customerName.includes(keyword) ||
        phone.includes(keyword) ||
        email.includes(keyword) ||
        address.includes(keyword);

      const matchesStatus =
        orderStatusFilter === "all" ||
        statusLabel(order.status) === orderStatusFilter;

      const matchesPayment =
        orderPaymentFilter === "all" ||
        (order.paymentStatus || "Chưa thanh toán") === orderPaymentFilter;

      let matchesDate = true;
      if (orderDateFilter) {
        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) {
          matchesDate = false;
        } else {
          const year = createdAt.getFullYear();
          const month = String(createdAt.getMonth() + 1).padStart(2, "0");
          const day = String(createdAt.getDate()).padStart(2, "0");
          matchesDate = `${year}-${month}-${day}` === orderDateFilter;
        }
      }

      return matchesKeyword && matchesStatus && matchesPayment && matchesDate;
    });

    return [...result].sort((a, b) => {
      if (orderSort === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (orderSort === "total-desc") {
        return Number(b.total || 0) - Number(a.total || 0);
      }
      if (orderSort === "total-asc") {
        return Number(a.total || 0) - Number(b.total || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [orders, orderSearch, orderStatusFilter, orderPaymentFilter, orderDateFilter, orderSort]);

  const resetOrderFilters = () => {
    setOrderSearch("");
    setOrderStatusFilter("all");
    setOrderPaymentFilter("all");
    setOrderDateFilter("");
    setOrderSort("newest");
  };

  // ===================================================
  // THÊM SẢN PHẨM
  // ===================================================
  const openCreateProduct =
    () => {
      setEditingProductId(
        null
      );

      setProductForm(
        emptyProduct
      );

      setImageFileName("");

      setShowProductForm(
        true
      );

      setMessage("");
      setError("");
    };

  // ===================================================
  // SỬA SẢN PHẨM
  // ===================================================
  const openEditProduct = (
    product
  ) => {
    setEditingProductId(
      product._id
    );

    setProductForm({
      name:
        product.name || "",

      price:
        product.price ?? "",

      category:
        product.category ||
        "Áo",

      image:
        product.image || "",

      sizes:
        (
          product.sizes || []
        ).join(", "),

      colors:
        (
          product.colors || []
        ).join(", "),

      description:
        product.description ||
        "",

      stock:
        product.stock ?? 0,
    });

    setImageFileName("");

    setShowProductForm(
      true
    );

    setMessage("");
    setError("");
  };

  // ===================================================
  // CHANGE PRODUCT FORM
  // ===================================================
  const handleProductChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setProductForm(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };

  // ===================================================
  // CHỌN ẢNH SẢN PHẨM TỪ MÁY
  // ===================================================
  const handleProductImageFile =
    (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setError(
          "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP."
        );

        event.target.value = "";
        return;
      }

      const maxSize =
        2 * 1024 * 1024;

      if (file.size > maxSize) {
        setError(
          "Ảnh quá lớn. Vui lòng chọn ảnh không vượt quá 2 MB."
        );

        event.target.value = "";
        return;
      }

      setError("");

      const reader =
        new FileReader();

      reader.onload = () => {
        setProductForm(
          (prev) => ({
            ...prev,
            image:
              String(
                reader.result ||
                  ""
              ),
          })
        );

        setImageFileName(
          file.name
        );
      };

      reader.onerror = () => {
        setError(
          "Không thể đọc file ảnh. Vui lòng thử lại."
        );
      };

      reader.readAsDataURL(
        file
      );
    };

  const removeProductImage =
    () => {
      setProductForm(
        (prev) => ({
          ...prev,
          image: "",
        })
      );

      setImageFileName("");
    };

  // ===================================================
  // LƯU SẢN PHẨM
  // ===================================================
  const saveProduct = async (
    event
  ) => {
    event.preventDefault();

    setSavingProduct(true);
    setMessage("");
    setError("");

    const payload = {
      name:
        productForm.name.trim(),

      price:
        Number(
          productForm.price
        ),

      category:
        productForm.category.trim(),

      image:
        productForm.image.trim(),

      sizes:
        productForm.sizes
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean),

      colors:
        productForm.colors
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean),

      description:
        productForm.description.trim(),

      stock:
        Number(
          productForm.stock
        ),
    };

    // ===============================================
    // VALIDATE
    // ===============================================
    if (!payload.name) {
      setError(
        "Vui lòng nhập tên sản phẩm."
      );

      setSavingProduct(false);
      return;
    }

    if (
      !Number.isFinite(
        payload.price
      ) ||
      payload.price < 0
    ) {
      setError(
        "Giá sản phẩm không hợp lệ."
      );

      setSavingProduct(false);
      return;
    }

    if (
      !Number.isFinite(
        payload.stock
      ) ||
      payload.stock < 0
    ) {
      setError(
        "Tồn kho không hợp lệ."
      );

      setSavingProduct(false);
      return;
    }

    try {
      const url =
        editingProductId
          ? `${API_BASE_URL}/products/${editingProductId}`
          : `${API_BASE_URL}/products`;

      const response =
        await fetch(
          url,
          {
            method:
              editingProductId
                ? "PUT"
                : "POST",

            headers:
              authHeaders,

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể lưu sản phẩm"
        );
      }

      setShowProductForm(
        false
      );

      setMessage(
        editingProductId
          ? "✅ Đã cập nhật sản phẩm thành công."
          : "✅ Đã thêm sản phẩm thành công."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Save product error:",
        err
      );

      setError(
        err.message ||
          "Không thể lưu sản phẩm"
      );
    } finally {
      setSavingProduct(
        false
      );
    }
  };

  // ===================================================
  // XÓA SẢN PHẨM
  // ===================================================
  const deleteProduct =
    async (product) => {
      const confirmed =
        window.confirm(
          `Bạn có chắc muốn xóa "${product.name}" không?`
        );

      if (!confirmed) {
        return;
      }

      setMessage("");
      setError("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/products/${product._id}`,
            {
              method:
                "DELETE",

              headers:
                authHeaders,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Không thể xóa sản phẩm"
          );
        }

        setMessage(
          "✅ Đã xóa sản phẩm."
        );

        await loadData();
      } catch (err) {
        console.error(
          "Delete product error:",
          err
        );

        setError(
          err.message ||
            "Không thể xóa sản phẩm"
        );
      }
    };

  // ===================================================
  // CẬP NHẬT TRẠNG THÁI ĐƠN
  // ===================================================
  const updateOrderStatus =
    async (
      orderId,
      status
    ) => {
      setMessage("");
      setError("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/orders/${orderId}/status`,
            {
              method: "PUT",

              headers:
                authHeaders,

              body:
                JSON.stringify({
                  status,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Không thể cập nhật trạng thái"
          );
        }

        setMessage(
          "✅ Đã cập nhật trạng thái đơn hàng."
        );

        await loadData();
      } catch (err) {
        console.error(
          "Update order status error:",
          err
        );

        setError(
          err.message ||
            "Không thể cập nhật trạng thái"
        );
      }
    };

  // ===================================================
  // CẬP NHẬT TRẠNG THÁI THANH TOÁN
  // ===================================================
  const updatePaymentStatus = async (orderId, paymentStatus) => {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/payment-status`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ paymentStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể cập nhật thanh toán"
        );
      }

      setMessage(
        paymentStatus === "Đã thanh toán"
          ? "✅ Đã xác nhận đơn hàng đã thanh toán."
          : "↩️ Đã chuyển đơn hàng về chưa thanh toán."
      );

      await loadData();
    } catch (err) {
      console.error("Update payment status error:", err);
      setError(
        err.message ||
          "Không thể cập nhật trạng thái thanh toán"
      );
    }
  };

  // ===================================================
  // CẬP NHẬT QUYỀN TÀI KHOẢN
  // ===================================================
  // ===================================================
  // VOUCHER - MỞ FORM THÊM
  // ===================================================
  const openCreateCoupon = () => {
    setEditingCouponId(null);
    setCouponForm(emptyCoupon);
    setShowCouponForm(true);
    setMessage("");
    setError("");
  };

  // ===================================================
  // VOUCHER - MỞ FORM SỬA
  // ===================================================
  const openEditCoupon = (coupon) => {
    setEditingCouponId(coupon._id);

    setCouponForm({
      code: coupon.code || "",
      name: coupon.name || "",
      type: coupon.type || "PERCENT",
      value: Number(coupon.value || 0),
      minOrder: Number(coupon.minOrder || 0),
      maxDiscount: Number(coupon.maxDiscount || 0),
      startDate: toDateInputValue(coupon.startDate),
      endDate: toDateInputValue(coupon.endDate),
      usageLimit: Number(coupon.usageLimit || 0),
      active: coupon.active !== false,
    });

    setShowCouponForm(true);
    setMessage("");
    setError("");
  };

  const handleCouponChange = (event) => {
    const { name, value, type, checked } = event.target;

    setCouponForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "code"
          ? value.toUpperCase()
          : value,
    }));
  };

  // ===================================================
  // VOUCHER - LƯU
  // ===================================================
  const saveCoupon = async (event) => {
    event.preventDefault();
    setSavingCoupon(true);
    setMessage("");
    setError("");

    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      name: couponForm.name.trim(),
      type: couponForm.type,
      value:
        couponForm.type === "FREESHIP"
          ? 0
          : Number(couponForm.value || 0),
      minOrder: Number(couponForm.minOrder || 0),
      maxDiscount:
        couponForm.type === "PERCENT"
          ? Number(couponForm.maxDiscount || 0)
          : 0,
      startDate: couponForm.startDate || null,
      endDate: couponForm.endDate || null,
      usageLimit: Number(couponForm.usageLimit || 0),
      active: Boolean(couponForm.active),
    };

    if (!payload.code || !payload.name) {
      setError("Vui lòng nhập mã và tên voucher.");
      setSavingCoupon(false);
      return;
    }

    if (
      payload.type === "PERCENT" &&
      (payload.value <= 0 || payload.value > 100)
    ) {
      setError("Voucher phần trăm phải lớn hơn 0 và không vượt quá 100%.");
      setSavingCoupon(false);
      return;
    }

    if (
      payload.type === "FIXED" &&
      payload.value <= 0
    ) {
      setError("Số tiền giảm phải lớn hơn 0.");
      setSavingCoupon(false);
      return;
    }

    if (
      payload.startDate &&
      payload.endDate &&
      new Date(payload.startDate) >
        new Date(payload.endDate)
    ) {
      setError("Ngày bắt đầu không được sau ngày kết thúc.");
      setSavingCoupon(false);
      return;
    }

    try {
      const url = editingCouponId
        ? `${API_BASE_URL}/coupons/${editingCouponId}`
        : `${API_BASE_URL}/coupons`;

      const response = await fetch(url, {
        method: editingCouponId ? "PUT" : "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể lưu voucher"
        );
      }

      setShowCouponForm(false);
      setEditingCouponId(null);
      setCouponForm(emptyCoupon);
      setMessage(
        editingCouponId
          ? "✅ Đã cập nhật voucher."
          : "✅ Đã tạo voucher mới."
      );

      await loadData();
    } catch (err) {
      console.error("Save coupon error:", err);
      setError(
        err.message || "Không thể lưu voucher"
      );
    } finally {
      setSavingCoupon(false);
    }
  };

  // ===================================================
  // VOUCHER - BẬT / TẮT
  // ===================================================
  const toggleCouponActive = async (coupon) => {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/coupons/${coupon._id}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            minOrder: coupon.minOrder,
            maxDiscount: coupon.maxDiscount,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            usageLimit: coupon.usageLimit,
            active: !coupon.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể đổi trạng thái voucher"
        );
      }

      setMessage(
        coupon.active
          ? `⏸️ Đã tắt ${coupon.code}.`
          : `✅ Đã bật ${coupon.code}.`
      );

      await loadData();
    } catch (err) {
      console.error("Toggle coupon error:", err);
      setError(
        err.message ||
          "Không thể đổi trạng thái voucher"
      );
    }
  };

  // ===================================================
  // VOUCHER - XÓA
  // ===================================================
  const deleteCoupon = async (coupon) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa voucher "${coupon.code}" không?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/coupons/${coupon._id}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể xóa voucher"
        );
      }

      setMessage(`🗑️ Đã xóa voucher ${coupon.code}.`);
      await loadData();
    } catch (err) {
      console.error("Delete coupon error:", err);
      setError(
        err.message || "Không thể xóa voucher"
      );
    }
  };

  const updateUserRole =
    async (
      userId,
      role
    ) => {
      setMessage("");
      setError("");

      const confirmed =
        window.confirm(
          role === "admin"
            ? "Bạn có chắc muốn cấp quyền Admin cho tài khoản này?"
            : "Bạn có chắc muốn chuyển tài khoản này thành User?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/users/${userId}/role`,
            {
              method: "PUT",

              headers:
                authHeaders,

              body:
                JSON.stringify({
                  role,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Không thể cập nhật quyền"
          );
        }

        setMessage(
          "✅ Đã cập nhật quyền tài khoản."
        );

        await loadData();
      } catch (err) {
        console.error(
          "Update user role error:",
          err
        );

        setError(
          err.message ||
            "Không thể cập nhật quyền tài khoản"
        );
      }
    };

  // ===================================================
  // IN HÓA ĐƠN / PHIẾU GIAO HÀNG
  // ===================================================
  const printOrderInvoice = (order) => {
    if (!order) return;

    const currentStatus =
      statusLabel(order.status);

    const paymentMethod =
      order.customer?.payment === "BANK"
        ? "Chuyển khoản"
        : "Thanh toán khi nhận hàng (COD)";

    const paymentStatus =
      order.paymentStatus ||
      "Chưa thanh toán";

    const itemRows = (order.items || [])
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.name || ""}</strong>
              <div class="muted">
                ${item.size ? `Size: ${item.size}` : ""}
                ${
                  item.size && item.color
                    ? " · "
                    : ""
                }
                ${item.color ? `Màu: ${item.color}` : ""}
              </div>
            </td>
            <td class="center">${Number(item.quantity || 0)}</td>
            <td class="right">${formatPrice(item.price)}</td>
            <td class="right">
              ${formatPrice(
                Number(item.price || 0) *
                  Number(item.quantity || 0)
              )}
            </td>
          </tr>
        `
      )
      .join("");

    const invoiceWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=700"
      );

    if (!invoiceWindow) {
      alert(
        "Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại."
      );
      return;
    }

    const safeText = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    invoiceWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <title>Hóa đơn ${safeText(
            order.orderCode || order._id
          )}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .invoice {
              max-width: 820px;
              margin: 0 auto;
            }

            .top {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding-bottom: 18px;
              border-bottom: 2px solid #111827;
            }

            .brand h1 {
              margin: 0 0 5px;
              font-size: 28px;
            }

            .brand p,
            .invoice-info p {
              margin: 4px 0;
              font-size: 13px;
              color: #4b5563;
            }

            .invoice-info {
              text-align: right;
            }

            .invoice-info strong {
              display: block;
              margin-bottom: 7px;
              font-size: 18px;
            }

            .section {
              margin-top: 22px;
            }

            .section h2 {
              margin: 0 0 10px;
              font-size: 16px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 28px;
              padding: 14px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
            }

            .info-row {
              font-size: 13px;
              line-height: 1.5;
            }

            .info-row span {
              color: #6b7280;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th,
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
              vertical-align: top;
            }

            th {
              text-align: left;
              background: #f9fafb;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .muted {
              margin-top: 4px;
              color: #6b7280;
              font-size: 11px;
            }

            .totals {
              width: 360px;
              margin: 18px 0 0 auto;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 6px 0;
              font-size: 13px;
            }

            .grand-total {
              margin-top: 6px;
              padding-top: 10px;
              border-top: 2px solid #111827;
              font-size: 17px;
              font-weight: 700;
            }

            .status-box {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 18px;
            }

            .status-item {
              padding: 12px;
              border-radius: 8px;
              background: #f9fafb;
              font-size: 12px;
            }

            .footer {
              margin-top: 35px;
              padding-top: 15px;
              border-top: 1px dashed #d1d5db;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }

            @media print {
              body {
                padding: 0;
              }

              .invoice {
                max-width: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="invoice">

            <div class="top">
              <div class="brand">
                <h1>ClothStore</h1>
                <p>Website bán quần áo trực tuyến</p>
                <p>HÓA ĐƠN / PHIẾU GIAO HÀNG</p>
              </div>

              <div class="invoice-info">
                <strong>
                  ${safeText(
                    order.orderCode || order._id
                  )}
                </strong>

                <p>
                  Ngày đặt:
                  ${safeText(
                    formatDate(order.createdAt)
                  )}
                </p>

                <p>
                  Trạng thái:
                  ${safeText(currentStatus)}
                </p>
              </div>
            </div>

            <div class="section">
              <h2>Thông tin khách hàng</h2>

              <div class="info-grid">
                <div class="info-row">
                  <span>Họ tên:</span>
                  <strong>
                    ${safeText(
                      order.customer?.name ||
                        order.user?.name ||
                        ""
                    )}
                  </strong>
                </div>

                <div class="info-row">
                  <span>Email:</span>
                  ${safeText(
                    order.user?.email || "—"
                  )}
                </div>

                <div class="info-row">
                  <span>Số điện thoại:</span>
                  ${safeText(
                    order.customer?.phone || "—"
                  )}
                </div>

                <div class="info-row">
                  <span>Địa chỉ:</span>
                  ${safeText(
                    order.customer?.address || "—"
                  )}
                </div>

                <div class="info-row">
                  <span>Phương thức thanh toán:</span>
                  ${safeText(paymentMethod)}
                </div>

                <div class="info-row">
                  <span>Trạng thái thanh toán:</span>
                  <strong>
                    ${safeText(paymentStatus)}
                  </strong>
                </div>

                <div class="info-row" style="grid-column: 1 / -1;">
                  <span>Ghi chú:</span>
                  ${safeText(
                    order.customer?.note ||
                      "Không có"
                  )}
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Sản phẩm</h2>

              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Sản phẩm</th>
                    <th class="center">SL</th>
                    <th class="right">Đơn giá</th>
                    <th class="right">Thành tiền</th>
                  </tr>
                </thead>

                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Tạm tính</span>
                <strong>
                  ${safeText(
                    formatPrice(order.subtotal)
                  )}
                </strong>
              </div>

              <div class="total-row">
                <span>Phí vận chuyển</span>
                <strong>
                  ${
                    Number(order.shipping || 0) === 0
                      ? "Miễn phí"
                      : safeText(
                          formatPrice(
                            order.shipping
                          )
                        )
                  }
                </strong>
              </div>

              <div class="total-row grand-total">
                <span>Tổng thanh toán</span>
                <span>
                  ${safeText(
                    formatPrice(order.total)
                  )}
                </span>
              </div>
            </div>

            <div class="status-box">
              <div class="status-item">
                <strong>Trạng thái đơn:</strong>
                ${safeText(currentStatus)}
              </div>

              <div class="status-item">
                <strong>Thanh toán:</strong>
                ${safeText(paymentStatus)}
              </div>
            </div>

            <div class="footer">
              Cảm ơn quý khách đã mua sắm tại ClothStore.
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    invoiceWindow.document.close();
  };

  // ===================================================
  // TIÊU ĐỀ TAB
  // ===================================================
  const getPageTitle = () => {
    switch (tab) {
      case "products":
        return "Quản lý sản phẩm";

      case "orders":
        return "Quản lý đơn hàng";

      case "customers":
        return "Quản lý khách hàng";

      default:
        return "Tổng quan";
    }
  };

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="admin-overlay">
      <div className="admin-dashboard">

        {/* ============================================= */}
        {/* SIDEBAR */}
        {/* ============================================= */}
        <aside className="admin-sidebar">

          <div className="admin-brand">
            <div className="admin-logo">
              🛍️
            </div>

            <div>
              <strong>
                ClothStore
              </strong>

              <span>
                ADMIN
              </span>
            </div>
          </div>

          <nav className="admin-nav">

            <button
              className={
                tab ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "overview"
                )
              }
            >
              📊 Tổng quan
            </button>

            <button
              className={
                tab ===
                "products"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "products"
                )
              }
            >
              👕 Sản phẩm
            </button>

            <button
              className={
                tab ===
                "orders"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "orders"
                )
              }
            >
              📦 Đơn hàng

              {pendingOrders >
                0 && (
                <span
                  style={{
                    marginLeft:
                      "8px",
                  }}
                >
                  (
                  {
                    pendingOrders
                  }
                  )
                </span>
              )}
            </button>

            <button
              className={
                tab ===
                "coupons"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "coupons"
                )
              }
            >
              🎟️ Voucher
            </button>

            <button
              className={
                tab === "maintenance"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab("maintenance")
              }
            >
              🛠️ Bảo trì
            </button>

            <button
              className={
                tab ===
                "customers"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "customers"
                )
              }
            >
              👥 Khách hàng
            </button>

          </nav>

          <button
            className="admin-close"
            onClick={
              onClose
            }
          >
            ← Quay lại cửa hàng
          </button>

        </aside>

        {/* ============================================= */}
        {/* MAIN */}
        {/* ============================================= */}
        <main className="admin-main">

          {/* HEADER */}
          <header className="admin-header">

            <div>
              <p className="admin-kicker">
                QUẢN TRỊ HỆ THỐNG
              </p>

              <h1>
                {getPageTitle()}
              </h1>
            </div>

            <button
              className="admin-refresh"
              onClick={
                loadData
              }
              disabled={
                loading
              }
            >
              ↻{" "}
              {loading
                ? "Đang tải..."
                : "Làm mới"}
            </button>

          </header>

          {/* MESSAGE */}
          {message && (
            <div className="admin-message">
              {message}
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="admin-error">
              ⚠️ {error}
            </div>
          )}

          {/* =========================================== */}
          {/* OVERVIEW */}
          {/* =========================================== */}
          {tab ===
            "overview" && (
            <section className="admin-content">

              {/* STATS */}
              <div className="admin-stats">

                <div className="admin-stat-card">
                  <span>
                    👕
                  </span>

                  <div>
                    <small>
                      Sản phẩm
                    </small>

                    <strong>
                      {
                        products.length
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    👥
                  </span>

                  <div>
                    <small>
                      Khách hàng
                    </small>

                    <strong>
                      {
                        normalCustomers.length
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    📦
                  </span>

                  <div>
                    <small>
                      Đơn hàng
                    </small>

                    <strong>
                      {
                        orders.length
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    ⏳
                  </span>

                  <div>
                    <small>
                      Chờ xác nhận
                    </small>

                    <strong>
                      {
                        pendingOrders
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    🚚
                  </span>

                  <div>
                    <small>
                      Đang giao
                    </small>

                    <strong>
                      {
                        shippingOrders
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    ✅
                  </span>

                  <div>
                    <small>
                      Đã giao
                    </small>

                    <strong>
                      {
                        deliveredOrders
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    ❌
                  </span>

                  <div>
                    <small>
                      Đã hủy
                    </small>

                    <strong>
                      {
                        cancelledOrders
                      }
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>
                    💰
                  </span>

                  <div>
                    <small>
                      Doanh thu
                    </small>

                    <strong>
                      {formatPrice(
                        totalRevenue
                      )}
                    </strong>
                  </div>
                </div>

              </div>

              {/* BIỂU ĐỒ THỐNG KÊ */}
              <AdminCharts orders={orders} />

              {/* ORDER STATUS */}
              <div className="admin-panel">

                <div className="admin-panel-title">
                  <div>
                    <h2>
                      📦 Trạng thái đơn hàng
                    </h2>

                    <p>
                      Tổng hợp tình trạng xử lý đơn hàng.
                    </p>
                  </div>

                  <strong>
                    {
                      orders.length
                    }
                  </strong>
                </div>

                <div className="admin-stock-list">

                  <div className="admin-stock-row">
                    <span>
                      ⏳ Chờ xác nhận
                    </span>

                    <strong>
                      {
                        pendingOrders
                      }
                    </strong>
                  </div>

                  <div className="admin-stock-row">
                    <span>
                      📋 Đã xác nhận
                    </span>

                    <strong>
                      {
                        confirmedOrders
                      }
                    </strong>
                  </div>

                  <div className="admin-stock-row">
                    <span>
                      🚚 Đang giao
                    </span>

                    <strong>
                      {
                        shippingOrders
                      }
                    </strong>
                  </div>

                  <div className="admin-stock-row">
                    <span>
                      ✅ Đã giao
                    </span>

                    <strong>
                      {
                        deliveredOrders
                      }
                    </strong>
                  </div>

                  <div className="admin-stock-row">
                    <span>
                      ❌ Đã hủy
                    </span>

                    <strong>
                      {
                        cancelledOrders
                      }
                    </strong>
                  </div>

                </div>

              </div>

              {/* STOCK */}
              <div className="admin-panel">

                <div className="admin-panel-title">

                  <div>
                    <h2>
                      📦 Tình trạng kho
                    </h2>

                    <p>
                      Tổng số lượng sản phẩm hiện có.
                    </p>
                  </div>

                  <strong>
                    {
                      stockTotal
                    }
                  </strong>

                </div>

                <div className="admin-stock-list">

                  {products.map(
                    (
                      product
                    ) => (
                      <div
                        className="admin-stock-row"
                        key={
                          product._id
                        }
                      >
                        <span>
                          {
                            product.name
                          }
                        </span>

                        <span>
                          {
                            product.stock ||
                            0
                          }{" "}
                          sản phẩm
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>

              {/* LOW STOCK */}
              <div className="admin-panel">

                <div className="admin-panel-title">

                  <div>
                    <h2>
                      ⚠️ Sản phẩm sắp hết
                    </h2>

                    <p>
                      Các sản phẩm còn từ 10 sản phẩm trở xuống.
                    </p>
                  </div>

                  <strong>
                    {
                      lowStockProducts.length
                    }
                  </strong>

                </div>

                {lowStockProducts.length ===
                0 ? (
                  <div className="admin-no-data">
                    ✅ Kho hiện đang ổn.
                  </div>
                ) : (
                  <div className="admin-stock-list">

                    {lowStockProducts.map(
                      (
                        product
                      ) => (
                        <div
                          className="admin-stock-row"
                          key={
                            product._id
                          }
                        >
                          <span>
                            {
                              product.name
                            }
                          </span>

                          <strong>
                            Còn{" "}
                            {
                              product.stock
                            }
                          </strong>
                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </section>
          )}

          {/* =========================================== */}
          {/* PRODUCTS */}
          {/* =========================================== */}
          {tab === "products" && (
            <section className="admin-content">
              <div className="admin-section-head">
                <div>
                  <h2>Danh sách sản phẩm</h2>
                  <p>
                    Tìm kiếm, lọc tồn kho và quản lý sản phẩm trong MongoDB.
                  </p>
                </div>

                <button
                  className="admin-primary"
                  onClick={openCreateProduct}
                >
                  + Thêm sản phẩm
                </button>
              </div>

              <div className="admin-product-summary">
                <div>
                  <span>👕 Tổng sản phẩm</span>
                  <strong>{products.length}</strong>
                </div>
                <div>
                  <span>📦 Tổng tồn kho</span>
                  <strong>{stockTotal}</strong>
                </div>
                <div className={lowOnlyStockCount > 0 ? "warning" : ""}>
                  <span>⚠️ Sắp hết hàng</span>
                  <strong>{lowOnlyStockCount}</strong>
                </div>
                <div className={outOfStockCount > 0 ? "danger" : ""}>
                  <span>⛔ Hết hàng</span>
                  <strong>{outOfStockCount}</strong>
                </div>
              </div>

              {(lowOnlyStockCount > 0 || outOfStockCount > 0) && (
                <div className="admin-stock-alert">
                  <strong>⚠️ Cảnh báo tồn kho:</strong>{" "}
                  {lowOnlyStockCount > 0 && (
                    <span>{lowOnlyStockCount} sản phẩm sắp hết hàng. </span>
                  )}
                  {outOfStockCount > 0 && (
                    <span>{outOfStockCount} sản phẩm đã hết hàng.</span>
                  )}
                </div>
              )}

              <div className="admin-product-filters">
                <input
                  type="search"
                  placeholder="🔎 Tìm theo tên, danh mục, mô tả..."
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />

                <select
                  value={productCategoryFilter}
                  onChange={(event) =>
                    setProductCategoryFilter(event.target.value)
                  }
                >
                  <option value="all">Tất cả danh mục</option>
                  {productCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={productStockFilter}
                  onChange={(event) =>
                    setProductStockFilter(event.target.value)
                  }
                >
                  <option value="all">Tất cả tồn kho</option>
                  <option value="available">Còn nhiều (&gt; 10)</option>
                  <option value="low">Sắp hết (1 - 10)</option>
                  <option value="out">Hết hàng (0)</option>
                </select>

                <select
                  value={productSort}
                  onChange={(event) => setProductSort(event.target.value)}
                >
                  <option value="default">Sắp xếp mặc định</option>
                  <option value="name-asc">Tên A → Z</option>
                  <option value="price-asc">Giá thấp → cao</option>
                  <option value="price-desc">Giá cao → thấp</option>
                  <option value="stock-asc">Tồn kho thấp → cao</option>
                  <option value="stock-desc">Tồn kho cao → thấp</option>
                </select>

                <button
                  type="button"
                  className="admin-filter-reset"
                  onClick={resetProductFilters}
                >
                  Xóa lọc
                </button>
              </div>

              <div className="admin-product-result">
                Hiển thị <strong>{filteredProducts.length}</strong> /{" "}
                <strong>{products.length}</strong> sản phẩm
              </div>

              <div className="admin-product-table">
                <div className="admin-table-head">
                  <span>Sản phẩm</span>
                  <span>Danh mục</span>
                  <span>Giá</span>
                  <span>Tồn kho</span>
                  <span>Thao tác</span>
                </div>

                {filteredProducts.map((product) => {
                  const stock = Number(product.stock || 0);
                  const stockClass =
                    stock <= 0
                      ? "out"
                      : stock <= 10
                      ? "low"
                      : "ok";

                  return (
                    <div
                      className={`admin-table-row ${
                        stock <= 0 ? "admin-product-out-row" : ""
                      }`}
                      key={product._id}
                    >
                      <div className="admin-product-cell">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <div className="admin-product-placeholder">👕</div>
                        )}

                        <div>
                          <strong>{product.name}</strong>
                          {stock <= 0 && (
                            <small className="admin-product-out-text">
                              Hết hàng
                            </small>
                          )}
                        </div>
                      </div>

                      <span>{product.category}</span>

                      <strong>{formatPrice(product.price)}</strong>

                      <span className={`admin-stock-badge ${stockClass}`}>
                        {stock <= 0
                          ? "Hết hàng"
                          : stock <= 10
                          ? `${stock} - Sắp hết`
                          : `${stock} - Còn hàng`}
                      </span>

                      <div className="admin-actions">
                        <button onClick={() => openEditProduct(product)}>
                          ✏️ Sửa
                        </button>

                        <button
                          className="danger"
                          onClick={() => deleteProduct(product)}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!loading && filteredProducts.length === 0 && (
                  <div className="admin-no-data">
                    {products.length === 0
                      ? "Chưa có sản phẩm."
                      : "Không tìm thấy sản phẩm phù hợp với bộ lọc."}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =========================================== */}
          {/* ORDERS */}
          {/* =========================================== */}
          {tab === "orders" && (
            <section className="admin-content">
              <div className="admin-section-head">
                <div>
                  <h2>Danh sách đơn hàng</h2>
                  <p>Tìm kiếm, lọc, sắp xếp và cập nhật trạng thái đơn hàng.</p>
                </div>
                <strong>{filteredOrders.length} / {orders.length} đơn</strong>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px,2fr) repeat(4,minmax(140px,1fr)) auto",
                gap: "12px",
                marginBottom: "20px",
                alignItems: "end"
              }}>
                <label style={{display:"grid",gap:"7px"}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Tìm kiếm</span>
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Mã đơn, tên, email, SĐT, địa chỉ..."
                    style={{padding:"12px 13px",border:"1px solid #d8dee8",borderRadius:"10px",boxSizing:"border-box",width:"100%"}}
                  />
                </label>

                <label style={{display:"grid",gap:"7px"}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Trạng thái</span>
                  <select value={orderStatusFilter} onChange={(e)=>setOrderStatusFilter(e.target.value)}
                    style={{padding:"12px 13px",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff"}}>
                    <option value="all">Tất cả</option>
                    {STATUS_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label style={{display:"grid",gap:"7px"}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Thanh toán</span>
                  <select value={orderPaymentFilter} onChange={(e)=>setOrderPaymentFilter(e.target.value)}
                    style={{padding:"12px 13px",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff"}}>
                    <option value="all">Tất cả</option>
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                  </select>
                </label>

                <label style={{display:"grid",gap:"7px"}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Ngày đặt</span>
                  <input type="date" value={orderDateFilter} onChange={(e)=>setOrderDateFilter(e.target.value)}
                    style={{padding:"11px 12px",border:"1px solid #d8dee8",borderRadius:"10px"}} />
                </label>

                <label style={{display:"grid",gap:"7px"}}>
                  <span style={{fontSize:"13px",fontWeight:700}}>Sắp xếp</span>
                  <select value={orderSort} onChange={(e)=>setOrderSort(e.target.value)}
                    style={{padding:"12px 13px",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff"}}>
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="total-desc">Giá cao → thấp</option>
                    <option value="total-asc">Giá thấp → cao</option>
                  </select>
                </label>

                <button type="button" className="admin-secondary" onClick={resetOrderFilters}
                  style={{minHeight:"42px",whiteSpace:"nowrap"}}>🧹 Xóa lọc</button>
              </div>

              <div className="admin-orders">
                {filteredOrders.map((order) => {
                  const currentStatus = statusLabel(order.status);
                  const paymentMethod = order.customer?.payment || "COD";
                  const paymentLabel =
                    paymentMethod === "BANK"
                      ? "Chuyển khoản"
                      : "Thanh toán khi nhận hàng";
                  const paymentStatus =
                    order.paymentStatus || "Chưa thanh toán";

                  return (
                    <article className="admin-order-card" key={order._id}>
                      <div className="admin-order-header">
                        <div>
                          <small>Mã đơn hàng</small>
                          <strong>{order.orderCode || order._id}</strong>
                          <span>👤 {order.customer?.name || order.user?.name || "Khách hàng"}</span>
                          {order.user?.email && <span>✉️ {order.user.email}</span>}
                          {order.customer?.phone && <span>📞 {order.customer.phone}</span>}
                          {order.customer?.address && <span>📍 {order.customer.address}</span>}
                          <span>📅 {formatDate(order.createdAt)}</span>
                          <span>💳 {paymentLabel}</span>
                          {order.customer?.note && <span>📝 {order.customer.note}</span>}
                        </div>

                        <div style={{display:"grid",gap:"10px",minWidth:"220px"}}>
                          <small style={{fontWeight:700}}>Trạng thái đơn hàng</small>
                          <select
                            value={STATUS_OPTIONS.some((item)=>item.value===currentStatus) ? currentStatus : "Chờ xác nhận"}
                            onChange={(e)=>updateOrderStatus(order._id,e.target.value)}
                          >
                            {STATUS_OPTIONS.map((item)=>
                              <option key={item.value} value={item.value}>{item.label}</option>
                            )}
                          </select>

                          <div className="admin-payment-control">
                            <span className={`admin-payment-badge ${paymentStatus === "Đã thanh toán" ? "paid" : "unpaid"}`}>
                              {paymentStatus === "Đã thanh toán"
                                ? "✅ Đã thanh toán"
                                : "⏳ Chưa thanh toán"}
                            </span>

                            <button
                              type="button"
                              className={`admin-payment-button ${paymentStatus === "Đã thanh toán" ? "undo" : ""}`}
                              onClick={() =>
                                updatePaymentStatus(
                                  order._id,
                                  paymentStatus === "Đã thanh toán"
                                    ? "Chưa thanh toán"
                                    : "Đã thanh toán"
                                )
                              }
                            >
                              {paymentStatus === "Đã thanh toán"
                                ? "↩ Chuyển về chưa thanh toán"
                                : "✓ Xác nhận đã thanh toán"}
                            </button>

                            {order.paidAt && (
                              <small className="admin-paid-time">
                                Xác nhận: {formatDate(order.paidAt)}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="admin-order-products">
                        {(order.items || []).map((item,index)=>(
                          <div className="admin-order-product" key={`${order._id}-${index}`}>
                            <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                              {item.image && <img src={item.image} alt={item.name}
                                style={{width:"44px",height:"52px",objectFit:"cover",borderRadius:"8px",flexShrink:0}} />}
                              <span>
                                <strong>{item.name}</strong>
                                {item.size && ` · Size ${item.size}`}
                                {item.color && ` · ${item.color}`}
                              </span>
                            </div>
                            <span>{item.quantity} × {formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        display:"grid",
                        gridTemplateColumns:"repeat(3,minmax(120px,1fr))",
                        gap:"10px",
                        padding:"14px 0",
                        borderTop:"1px solid #eef1f5"
                      }}>
                        <div>
                          <small>Tạm tính</small>
                          <strong style={{display:"block",marginTop:"4px"}}>{formatPrice(order.subtotal)}</strong>
                        </div>
                        <div>
                          <small>Phí vận chuyển</small>
                          <strong style={{display:"block",marginTop:"4px"}}>
                            {Number(order.shipping || 0) === 0 ? "Miễn phí" : formatPrice(order.shipping)}
                          </strong>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <small>Tổng thanh toán</small>
                          <strong style={{display:"block",marginTop:"4px",fontSize:"18px"}}>{formatPrice(order.total)}</strong>
                        </div>
                      </div>

                      <div className="admin-order-footer">
                        <span>
                          Trạng thái: <strong>{currentStatus}</strong>
                        </span>

                        <span>
                          Số sản phẩm:{" "}
                          <strong>
                            {(order.items || []).reduce(
                              (sum, item) =>
                                sum +
                                Number(
                                  item.quantity || 0
                                ),
                              0
                            )}
                          </strong>
                        </span>

                        <div className="admin-order-footer-actions">
                          <button
                            type="button"
                            className="admin-order-detail-button"
                            onClick={() =>
                              setSelectedAdminOrder(order)
                            }
                          >
                            👁️ Xem chi tiết
                          </button>

                          <button
                            type="button"
                            className="admin-order-print-button"
                            onClick={() =>
                              printOrderInvoice(order)
                            }
                          >
                            🖨️ In hóa đơn
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!loading && filteredOrders.length === 0 && (
                  <div className="admin-no-data">
                    Không có đơn hàng phù hợp với bộ lọc hiện tại.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =========================================== */}
          {/* VOUCHERS */}
          {/* =========================================== */}
          {tab === "coupons" && (
            <section className="admin-content">
              <div className="admin-section-head">
                <div>
                  <h2>🎟️ Quản lý mã giảm giá</h2>
                  <p>
                    Tạo, chỉnh sửa, bật/tắt và theo dõi lượt sử dụng voucher.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-primary"
                  onClick={openCreateCoupon}
                >
                  + Thêm voucher
                </button>
              </div>

              <div className="admin-stats admin-coupon-stats">
                <div className="admin-stat-card">
                  <span>🎟️</span>
                  <div>
                    <small>Tổng voucher</small>
                    <strong>{coupons.length}</strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>✅</span>
                  <div>
                    <small>Đang hoạt động</small>
                    <strong>{activeCouponCount}</strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>⏸️</span>
                  <div>
                    <small>Đang tắt</small>
                    <strong>
                      {coupons.length - activeCouponCount}
                    </strong>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <span>🛍️</span>
                  <div>
                    <small>Lượt đã dùng</small>
                    <strong>{usedCouponCount}</strong>
                  </div>
                </div>
              </div>

              <div className="admin-coupon-toolbar">
                <input
                  type="text"
                  value={couponSearch}
                  onChange={(event) =>
                    setCouponSearch(event.target.value)
                  }
                  placeholder="🔍 Tìm mã hoặc tên voucher..."
                />

                <span>
                  {filteredCoupons.length} kết quả
                </span>
              </div>

              <div className="admin-coupon-grid">
                {filteredCoupons.map((coupon) => {
                  const expired =
                    coupon.endDate &&
                    new Date(coupon.endDate).getTime() <
                      Date.now();

                  const notStarted =
                    coupon.startDate &&
                    new Date(coupon.startDate).getTime() >
                      Date.now();

                  const exhausted =
                    Number(coupon.usageLimit || 0) > 0 &&
                    Number(coupon.usedCount || 0) >=
                      Number(coupon.usageLimit || 0);

                  const usable =
                    coupon.active &&
                    !expired &&
                    !notStarted &&
                    !exhausted;

                  return (
                    <article
                      className={`admin-coupon-card ${
                        usable ? "active" : "inactive"
                      }`}
                      key={coupon._id}
                    >
                      <div className="admin-coupon-card-top">
                        <div>
                          <span className="admin-coupon-code">
                            {coupon.code}
                          </span>

                          <h3>
                            {coupon.name}
                          </h3>
                        </div>

                        <span
                          className={`admin-coupon-status ${
                            usable ? "active" : "inactive"
                          }`}
                        >
                          {usable
                            ? "● Hoạt động"
                            : expired
                            ? "● Hết hạn"
                            : notStarted
                            ? "● Chưa bắt đầu"
                            : exhausted
                            ? "● Hết lượt"
                            : "● Đã tắt"}
                        </span>
                      </div>

                      <div className="admin-coupon-value">
                        {coupon.type === "PERCENT" && (
                          <>
                            <strong>
                              {Number(coupon.value || 0)}%
                            </strong>
                            <span>Giảm theo phần trăm</span>
                          </>
                        )}

                        {coupon.type === "FIXED" && (
                          <>
                            <strong>
                              {formatPrice(coupon.value)}
                            </strong>
                            <span>Giảm tiền trực tiếp</span>
                          </>
                        )}

                        {coupon.type === "FREESHIP" && (
                          <>
                            <strong>FREESHIP</strong>
                            <span>Miễn phí vận chuyển</span>
                          </>
                        )}
                      </div>

                      <div className="admin-coupon-info">
                        <div>
                          <span>Đơn tối thiểu</span>
                          <strong>
                            {Number(coupon.minOrder || 0) > 0
                              ? formatPrice(coupon.minOrder)
                              : "Không giới hạn"}
                          </strong>
                        </div>

                        {coupon.type === "PERCENT" && (
                          <div>
                            <span>Giảm tối đa</span>
                            <strong>
                              {Number(
                                coupon.maxDiscount || 0
                              ) > 0
                                ? formatPrice(
                                    coupon.maxDiscount
                                  )
                                : "Không giới hạn"}
                            </strong>
                          </div>
                        )}

                        <div>
                          <span>Lượt sử dụng</span>
                          <strong>
                            {Number(coupon.usedCount || 0)}
                            {" / "}
                            {Number(coupon.usageLimit || 0) > 0
                              ? Number(coupon.usageLimit)
                              : "∞"}
                          </strong>
                        </div>

                        <div>
                          <span>Thời gian</span>
                          <strong>
                            {coupon.startDate
                              ? formatDate(coupon.startDate)
                              : "Bất kỳ"}
                            {" → "}
                            {coupon.endDate
                              ? formatDate(coupon.endDate)
                              : "Không hạn"}
                          </strong>
                        </div>
                      </div>

                      <div className="admin-coupon-actions">
                        <button
                          type="button"
                          className="edit"
                          onClick={() =>
                            openEditCoupon(coupon)
                          }
                        >
                          ✏️ Sửa
                        </button>

                        <button
                          type="button"
                          className={
                            coupon.active
                              ? "pause"
                              : "enable"
                          }
                          onClick={() =>
                            toggleCouponActive(coupon)
                          }
                        >
                          {coupon.active
                            ? "⏸️ Tắt"
                            : "▶️ Bật"}
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={() =>
                            deleteCoupon(coupon)
                          }
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </article>
                  );
                })}

                {!loading &&
                  filteredCoupons.length === 0 && (
                    <div className="admin-coupon-empty">
                      <span>🎟️</span>
                      <h3>Chưa có voucher</h3>
                      <p>
                        Tạo voucher đầu tiên để khách hàng có thể áp dụng khi thanh toán.
                      </p>
                      <button
                        type="button"
                        className="admin-primary"
                        onClick={openCreateCoupon}
                      >
                        + Tạo voucher
                      </button>
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* =========================================== */}
          {/* MAINTENANCE */}
          {/* =========================================== */}
          {tab === "maintenance" && (
            <section className="admin-content">
              <div className="admin-section-head">
                <div>
                  <h2>🛠️ Chế độ bảo trì</h2>
                  <p>
                    Tạm khóa website đối với khách hàng trong khi Admin vẫn có thể truy cập.
                  </p>
                </div>

                <span
                  className={`admin-maintenance-status ${
                    maintenanceForm.enabled
                      ? "enabled"
                      : "disabled"
                  }`}
                >
                  {maintenanceForm.enabled
                    ? "● Đang bảo trì"
                    : "● Website đang hoạt động"}
                </span>
              </div>

              <div className="admin-maintenance-layout">
                <div className="admin-maintenance-card">
                  <div className="admin-maintenance-toggle-row">
                    <div>
                      <strong>
                        Bật chế độ bảo trì
                      </strong>

                      <p>
                        Khi bật, khách hàng sẽ không thấy cửa hàng và được chuyển sang trang thông báo bảo trì.
                      </p>
                    </div>

                    <label className="admin-maintenance-switch">
                      <input
                        type="checkbox"
                        checked={
                          maintenanceForm.enabled
                        }
                        onChange={(event) =>
                          setMaintenanceForm(
                            (prev) => ({
                              ...prev,
                              enabled:
                                event.target.checked,
                            })
                          )
                        }
                      />

                      <span />
                    </label>
                  </div>

                  <label className="admin-maintenance-field">
                    <span>
                      Tiêu đề hiển thị
                    </span>

                    <input
                      type="text"
                      value={
                        maintenanceForm.title
                      }
                      onChange={(event) =>
                        setMaintenanceForm(
                          (prev) => ({
                            ...prev,
                            title:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Hệ thống đang bảo trì"
                    />
                  </label>

                  <label className="admin-maintenance-field">
                    <span>
                      Nội dung thông báo
                    </span>

                    <textarea
                      rows="5"
                      value={
                        maintenanceForm.message
                      }
                      onChange={(event) =>
                        setMaintenanceForm(
                          (prev) => ({
                            ...prev,
                            message:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Nhập thông báo cho khách hàng..."
                    />
                  </label>

                  <label className="admin-maintenance-field">
                    <span>
                      Thời gian dự kiến hoàn thành
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        maintenanceForm.estimatedEnd
                      }
                      onChange={(event) =>
                        setMaintenanceForm(
                          (prev) => ({
                            ...prev,
                            estimatedEnd:
                              event.target.value,
                          })
                        )
                      }
                    />

                    <small>
                      Có thể để trống nếu chưa xác định.
                    </small>
                  </label>

                  <div className="admin-maintenance-save-row">
                    <button
                      type="button"
                      className="admin-primary"
                      onClick={
                        saveMaintenanceSettings
                      }
                      disabled={
                        maintenanceSaving
                      }
                    >
                      {maintenanceSaving
                        ? "Đang lưu..."
                        : "💾 Lưu cài đặt"}
                    </button>
                  </div>
                </div>

                <div className="admin-maintenance-preview">
                  <span className="admin-maintenance-preview-label">
                    XEM TRƯỚC
                  </span>

                  <div className="admin-maintenance-preview-icon">
                    ⚙️
                  </div>

                  <small>
                    BẢO TRÌ HỆ THỐNG
                  </small>

                  <h3>
                    {maintenanceForm.title ||
                      "Hệ thống đang bảo trì"}
                  </h3>

                  <p>
                    {maintenanceForm.message ||
                      "ClothStore đang được nâng cấp. Vui lòng quay lại sau."}
                  </p>

                  {maintenanceForm.estimatedEnd && (
                    <div className="admin-maintenance-preview-time">
                      🕒{" "}
                      {new Date(
                        maintenanceForm.estimatedEnd
                      ).toLocaleString(
                        "vi-VN"
                      )}
                    </div>
                  )}

                  <div className="admin-maintenance-admin-note">
                    🔐 Admin vẫn đăng nhập và truy cập được website.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =========================================== */}
          {/* CUSTOMERS */}
          {/* =========================================== */}
          {tab ===
            "customers" && (
            <section className="admin-content">

              <div className="admin-section-head">

                <div>
                  <h2>
                    Danh sách tài khoản
                  </h2>

                  <p>
                    Quản lý khách hàng và tài khoản Admin.
                  </p>
                </div>

                <div>
                  <strong>
                    {
                      customers.length
                    }{" "}
                    tài khoản
                  </strong>
                </div>

              </div>

              {/* CUSTOMER STATS */}
              <div className="admin-stats">

                <div className="admin-stat-card">

                  <span>
                    👥
                  </span>

                  <div>
                    <small>
                      Khách hàng
                    </small>

                    <strong>
                      {
                        normalCustomers.length
                      }
                    </strong>
                  </div>

                </div>

                <div className="admin-stat-card">

                  <span>
                    🛡️
                  </span>

                  <div>
                    <small>
                      Admin
                    </small>

                    <strong>
                      {
                        adminCount
                      }
                    </strong>
                  </div>

                </div>

                <div className="admin-stat-card">

                  <span>
                    🧾
                  </span>

                  <div>
                    <small>
                      Tổng đơn khách
                    </small>

                    <strong>
                      {customers.reduce(
                        (
                          sum,
                          customer
                        ) =>
                          sum +
                          Number(
                            customer.orderCount ||
                              0
                          ),
                        0
                      )}
                    </strong>
                  </div>

                </div>

                <div className="admin-stat-card">

                  <span>
                    💰
                  </span>

                  <div>
                    <small>
                      Tổng chi tiêu
                    </small>

                    <strong>
                      {formatPrice(
                        customers.reduce(
                          (
                            sum,
                            customer
                          ) =>
                            sum +
                            Number(
                              customer.totalSpent ||
                                0
                            ),
                          0
                        )
                      )}
                    </strong>
                  </div>

                </div>

              </div>

              {/* SEARCH CUSTOMER */}
              <div
                style={{
                  marginBottom:
                    "20px",
                }}
              >
                <input
                  type="text"
                  value={
                    customerSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomerSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="🔍 Tìm theo tên hoặc email..."
                  style={{
                    width:
                      "100%",
                    padding:
                      "13px 16px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "10px",
                    fontSize:
                      "14px",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {/* CUSTOMER TABLE */}
              <div className="admin-product-table">

                <div
                  className="admin-table-head"
                  style={{
                    gridTemplateColumns:
                      "1.4fr 1.8fr 1fr 1fr 1.3fr",
                  }}
                >

                  <span>
                    Khách hàng
                  </span>

                  <span>
                    Email
                  </span>

                  <span>
                    Đơn hàng
                  </span>

                  <span>
                    Đã chi
                  </span>

                  <span>
                    Quyền
                  </span>

                </div>

                {filteredCustomers.map(
                  (
                    customer
                  ) => (
                    <div
                      className="admin-table-row"
                      key={
                        customer._id
                      }
                      style={{
                        gridTemplateColumns:
                          "1.4fr 1.8fr 1fr 1fr 1.3fr",
                      }}
                    >

                      {/* NAME */}
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "10px",
                        }}
                      >

                        <div
                          style={{
                            width:
                              "42px",
                            height:
                              "42px",
                            borderRadius:
                              "50%",
                            background:
                              "#f1f1f1",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            flexShrink:
                              0,
                            fontSize:
                              "20px",
                          }}
                        >
                          {customer.role ===
                          "admin"
                            ? "🛡️"
                            : "👤"}
                        </div>

                        <div>
                          <strong
                            style={{
                              display:
                                "block",
                            }}
                          >
                            {customer.name ||
                              "Chưa có tên"}
                          </strong>

                          <small>
                            Đăng ký:{" "}
                            {formatDate(
                              customer.createdAt
                            )}
                          </small>
                        </div>

                      </div>

                      {/* EMAIL */}
                      <span
                        style={{
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {
                          customer.email
                        }
                      </span>

                      {/* ORDERS */}
                      <div>
                        <strong>
                          {
                            customer.orderCount ||
                            0
                          }
                        </strong>

                        <small
                          style={{
                            display:
                              "block",
                            marginTop:
                              "3px",
                          }}
                        >
                          {
                            customer.deliveredCount ||
                            0
                          }{" "}
                          đã giao
                        </small>
                      </div>

                      {/* TOTAL SPENT */}
                      <strong>
                        {formatPrice(
                          customer.totalSpent ||
                            0
                        )}
                      </strong>

                      {/* ROLE */}
                      <div>

                        <select
                          value={
                            customer.role ||
                            "user"
                          }
                          onChange={(
                            event
                          ) => {
                            const newRole =
                              event
                                .target
                                .value;

                            if (
                              newRole ===
                              customer.role
                            ) {
                              return;
                            }

                            updateUserRole(
                              customer._id,
                              newRole
                            );
                          }}
                          style={{
                            width:
                              "100%",
                            padding:
                              "9px 10px",
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "8px",
                            background:
                              "#fff",
                          }}
                        >
                          <option value="user">
                            User
                          </option>

                          <option value="admin">
                            Admin
                          </option>
                        </select>

                        <small
                          style={{
                            display:
                              "block",
                            marginTop:
                              "5px",
                          }}
                        >
                          {customer.role ===
                          "admin"
                            ? "Quản trị viên"
                            : "Khách hàng"}
                        </small>

                      </div>

                    </div>
                  )
                )}

                {!loading &&
                  filteredCustomers.length ===
                    0 && (
                    <div className="admin-no-data">
                      Không tìm thấy khách hàng.
                    </div>
                  )}

              </div>

            </section>
          )}

        
          {/* =========================================== */}
          {/* ADMIN ORDER DETAIL MODAL */}
          {/* =========================================== */}
          {selectedAdminOrder && (
            <div
              className="admin-order-modal-overlay"
              onMouseDown={(event) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedAdminOrder(null);
                }
              }}
            >
              <div className="admin-order-modal">
                <div className="admin-order-modal-header">
                  <div>
                    <small>
                      CHI TIẾT ĐƠN HÀNG
                    </small>

                    <h2>
                      {selectedAdminOrder.orderCode ||
                        selectedAdminOrder._id}
                    </h2>

                    <p>
                      Đặt ngày{" "}
                      {formatDate(
                        selectedAdminOrder.createdAt
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-order-modal-close"
                    onClick={() =>
                      setSelectedAdminOrder(null)
                    }
                    aria-label="Đóng"
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-order-modal-status-row">
                  <span
                    className={`admin-order-modal-status status-${statusLabel(
                      selectedAdminOrder.status
                    )
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    📦{" "}
                    {statusLabel(
                      selectedAdminOrder.status
                    )}
                  </span>

                  <span
                    className={`admin-order-modal-payment ${
                      (selectedAdminOrder.paymentStatus ||
                        "Chưa thanh toán") ===
                      "Đã thanh toán"
                        ? "paid"
                        : "unpaid"
                    }`}
                  >
                    {(selectedAdminOrder.paymentStatus ||
                      "Chưa thanh toán") ===
                    "Đã thanh toán"
                      ? "✅ Đã thanh toán"
                      : "⏳ Chưa thanh toán"}
                  </span>
                </div>

                <div className="admin-order-detail-grid">
                  <section className="admin-order-detail-box">
                    <h3>
                      👤 Thông tin khách hàng
                    </h3>

                    <div className="admin-order-detail-row">
                      <span>Họ tên</span>
                      <strong>
                        {selectedAdminOrder.customer
                          ?.name ||
                          selectedAdminOrder.user
                            ?.name ||
                          "—"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Email</span>
                      <strong>
                        {selectedAdminOrder.user
                          ?.email || "—"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Số điện thoại</span>
                      <strong>
                        {selectedAdminOrder.customer
                          ?.phone || "—"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Địa chỉ</span>
                      <strong>
                        {selectedAdminOrder.customer
                          ?.address || "—"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Ghi chú</span>
                      <strong>
                        {selectedAdminOrder.customer
                          ?.note ||
                          "Không có ghi chú"}
                      </strong>
                    </div>
                  </section>

                  <section className="admin-order-detail-box">
                    <h3>
                      💳 Thanh toán
                    </h3>

                    <div className="admin-order-detail-row">
                      <span>Phương thức</span>
                      <strong>
                        {selectedAdminOrder.customer
                          ?.payment === "BANK"
                          ? "Chuyển khoản"
                          : "Thanh toán khi nhận hàng"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Trạng thái</span>
                      <strong>
                        {selectedAdminOrder.paymentStatus ||
                          "Chưa thanh toán"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Ngày xác nhận</span>
                      <strong>
                        {selectedAdminOrder.paidAt
                          ? new Date(
                              selectedAdminOrder.paidAt
                            ).toLocaleString(
                              "vi-VN"
                            )
                          : "—"}
                      </strong>
                    </div>

                    <div className="admin-order-detail-row">
                      <span>Trạng thái đơn</span>
                      <strong>
                        {statusLabel(
                          selectedAdminOrder.status
                        )}
                      </strong>
                    </div>
                  </section>
                </div>

                <section className="admin-order-detail-products">
                  <h3>
                    👕 Sản phẩm trong đơn
                  </h3>

                  <div className="admin-order-detail-product-list">
                    {(selectedAdminOrder.items || []).map(
                      (item, index) => (
                        <div
                          className="admin-order-detail-product"
                          key={`${selectedAdminOrder._id}-${index}`}
                        >
                          <div className="admin-order-detail-product-main">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                              />
                            ) : (
                              <div className="admin-order-detail-no-image">
                                👕
                              </div>
                            )}

                            <div>
                              <strong>
                                {item.name}
                              </strong>

                              <small>
                                {item.size
                                  ? `Size ${item.size}`
                                  : "Không có size"}

                                {item.color
                                  ? ` · ${item.color}`
                                  : ""}
                              </small>
                            </div>
                          </div>

                          <div className="admin-order-detail-product-price">
                            <span>
                              {item.quantity} ×{" "}
                              {formatPrice(
                                item.price
                              )}
                            </span>

                            <strong>
                              {formatPrice(
                                Number(
                                  item.quantity || 0
                                ) *
                                  Number(
                                    item.price || 0
                                  )
                              )}
                            </strong>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <section className="admin-order-detail-summary">
                  <div>
                    <span>Tạm tính</span>
                    <strong>
                      {formatPrice(
                        selectedAdminOrder.subtotal
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phí vận chuyển
                    </span>

                    <strong>
                      {Number(
                        selectedAdminOrder.shipping ||
                          0
                      ) === 0
                        ? "Miễn phí"
                        : formatPrice(
                            selectedAdminOrder.shipping
                          )}
                    </strong>
                  </div>

                  <div className="admin-order-detail-total">
                    <span>
                      Tổng thanh toán
                    </span>

                    <strong>
                      {formatPrice(
                        selectedAdminOrder.total
                      )}
                    </strong>
                  </div>
                </section>

                <div className="admin-order-modal-actions">
                  <button
                    type="button"
                    className="admin-order-modal-secondary"
                    onClick={() =>
                      setSelectedAdminOrder(null)
                    }
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    className="admin-order-modal-print"
                    onClick={() =>
                      printOrderInvoice(
                        selectedAdminOrder
                      )
                    }
                  >
                    🖨️ In hóa đơn / phiếu giao
                  </button>
                </div>
              </div>
            </div>
          )}

</main>
      </div>

      {/* =============================================== */}
      {/* FORM ADD / EDIT VOUCHER */}
      {/* =============================================== */}
      {showCouponForm && (
        <div
          className="admin-form-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCouponForm(false);
            }
          }}
        >
          <form
            className="admin-product-form admin-coupon-form-modal"
            onSubmit={saveCoupon}
          >
            <div className="admin-form-header">
              <div>
                <h2>
                  {editingCouponId
                    ? "Sửa voucher"
                    : "Thêm voucher mới"}
                </h2>
                <p>
                  Thiết lập điều kiện giảm giá cho ClothStore.
                </p>
              </div>

              <button
                type="button"
                className="admin-form-close"
                onClick={() =>
                  setShowCouponForm(false)
                }
              >
                ×
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                Mã voucher *

                <input
                  type="text"
                  name="code"
                  value={couponForm.code}
                  onChange={handleCouponChange}
                  placeholder="SALE10"
                  maxLength="30"
                  required
                />
              </label>

              <label>
                Tên chương trình *

                <input
                  type="text"
                  name="name"
                  value={couponForm.name}
                  onChange={handleCouponChange}
                  placeholder="Giảm 10% đơn hàng"
                  required
                />
              </label>

              <label>
                Loại voucher

                <select
                  name="type"
                  value={couponForm.type}
                  onChange={handleCouponChange}
                >
                  <option value="PERCENT">
                    Giảm theo %
                  </option>

                  <option value="FIXED">
                    Giảm số tiền cố định
                  </option>

                  <option value="FREESHIP">
                    Miễn phí vận chuyển
                  </option>
                </select>
              </label>

              {couponForm.type !== "FREESHIP" && (
                <label>
                  {couponForm.type === "PERCENT"
                    ? "Phần trăm giảm"
                    : "Số tiền giảm"}

                  <input
                    type="number"
                    name="value"
                    min="0"
                    max={
                      couponForm.type === "PERCENT"
                        ? "100"
                        : undefined
                    }
                    value={couponForm.value}
                    onChange={handleCouponChange}
                    required
                  />
                </label>
              )}

              <label>
                Đơn tối thiểu

                <input
                  type="number"
                  name="minOrder"
                  min="0"
                  step="1000"
                  value={couponForm.minOrder}
                  onChange={handleCouponChange}
                />
              </label>

              {couponForm.type === "PERCENT" && (
                <label>
                  Giảm tối đa

                  <input
                    type="number"
                    name="maxDiscount"
                    min="0"
                    step="1000"
                    value={couponForm.maxDiscount}
                    onChange={handleCouponChange}
                    placeholder="0 = không giới hạn"
                  />
                </label>
              )}

              <label>
                Ngày bắt đầu

                <input
                  type="date"
                  name="startDate"
                  value={couponForm.startDate}
                  onChange={handleCouponChange}
                />
              </label>

              <label>
                Ngày kết thúc

                <input
                  type="date"
                  name="endDate"
                  value={couponForm.endDate}
                  onChange={handleCouponChange}
                />
              </label>

              <label>
                Giới hạn lượt dùng

                <input
                  type="number"
                  name="usageLimit"
                  min="0"
                  value={couponForm.usageLimit}
                  onChange={handleCouponChange}
                  placeholder="0 = không giới hạn"
                />
              </label>

              <label className="admin-coupon-active-label">
                Trạng thái

                <span className="admin-coupon-switch-row">
                  <input
                    type="checkbox"
                    name="active"
                    checked={couponForm.active}
                    onChange={handleCouponChange}
                  />

                  <strong>
                    {couponForm.active
                      ? "Đang hoạt động"
                      : "Tạm tắt"}
                  </strong>
                </span>
              </label>
            </div>

            <div className="admin-coupon-preview">
              <span>Xem trước</span>

              <strong>
                {couponForm.code || "VOUCHER"}
              </strong>

              <p>
                {couponForm.type === "PERCENT"
                  ? `Giảm ${Number(
                      couponForm.value || 0
                    )}%`
                  : couponForm.type === "FIXED"
                  ? `Giảm ${formatPrice(
                      couponForm.value
                    )}`
                  : "Miễn phí vận chuyển"}
              </p>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={() =>
                  setShowCouponForm(false)
                }
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-primary"
                disabled={savingCoupon}
              >
                {savingCoupon
                  ? "Đang lưu..."
                  : editingCouponId
                  ? "Lưu thay đổi"
                  : "Tạo voucher"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =============================================== */}
      {/* FORM ADD / EDIT PRODUCT */}
      {/* =============================================== */}
      {showProductForm && (
        <div className="admin-form-overlay">

          <form
            className="admin-product-form"
            onSubmit={
              saveProduct
            }
          >

            <div className="admin-form-header">

              <div>

                <p className="admin-kicker">
                  {editingProductId
                    ? "CHỈNH SỬA"
                    : "TẠO MỚI"}
                </p>

                <h2>
                  {editingProductId
                    ? "Sửa sản phẩm"
                    : "Thêm sản phẩm"}
                </h2>

              </div>

              <button
                type="button"
                className="admin-form-close"
                onClick={() =>
                  setShowProductForm(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="admin-form-grid">

              {/* NAME */}
              <label>
                Tên sản phẩm

                <input
                  name="name"
                  value={
                    productForm.name
                  }
                  onChange={
                    handleProductChange
                  }
                  required
                />
              </label>

              {/* PRICE */}
              <label>
                Giá

                <input
                  name="price"
                  type="number"
                  min="0"
                  value={
                    productForm.price
                  }
                  onChange={
                    handleProductChange
                  }
                  required
                />
              </label>

              {/* CATEGORY */}
              <label>
                Danh mục

                <select
                  name="category"
                  value={
                    productForm.category
                  }
                  onChange={
                    handleProductChange
                  }
                >
                  <option>
                    Áo
                  </option>

                  <option>
                    Quần
                  </option>

                  <option>
                    Áo khoác
                  </option>
                </select>
              </label>

              {/* STOCK */}
              <label>
                Tồn kho

                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={
                    productForm.stock
                  }
                  onChange={
                    handleProductChange
                  }
                  required
                />
              </label>

              {/* IMAGE */}
              <div className="full admin-image-field">
                <span className="admin-image-label">
                  Hình ảnh sản phẩm
                </span>

                <div className="admin-image-upload-box">
                  <div className="admin-image-preview">
                    {productForm.image ? (
                      <img
                        src={
                          productForm.image
                        }
                        alt="Xem trước sản phẩm"
                      />
                    ) : (
                      <div className="admin-image-empty">
                        <span>🖼️</span>
                        <small>
                          Chưa chọn ảnh
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="admin-image-upload-actions">
                    <label className="admin-image-file-button">
                      📷 Chọn ảnh từ máy

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          handleProductImageFile
                        }
                      />
                    </label>

                    {imageFileName && (
                      <small className="admin-image-file-name">
                        {imageFileName}
                      </small>
                    )}

                    <small className="admin-image-help">
                      JPG, PNG hoặc WEBP · tối đa 2 MB
                    </small>

                    {productForm.image && (
                      <button
                        type="button"
                        className="admin-image-remove"
                        onClick={
                          removeProductImage
                        }
                      >
                        🗑️ Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-image-url-divider">
                  <span>
                    hoặc dùng link ảnh
                  </span>
                </div>

                <input
                  name="image"
                  value={
                    productForm.image.startsWith(
                      "data:image/"
                    )
                      ? ""
                      : productForm.image
                  }
                  onChange={(event) => {
                    setImageFileName(
                      ""
                    );

                    handleProductChange(
                      event
                    );
                  }}
                  placeholder="https://..."
                />
              </div>

              {/* SIZE */}
              <label>
                Kích thước

                <input
                  name="sizes"
                  value={
                    productForm.sizes
                  }
                  onChange={
                    handleProductChange
                  }
                  placeholder="S, M, L, XL"
                />
              </label>

              {/* COLOR */}
              <label>
                Màu sắc

                <input
                  name="colors"
                  value={
                    productForm.colors
                  }
                  onChange={
                    handleProductChange
                  }
                  placeholder="Đen, Trắng"
                />
              </label>

              {/* DESCRIPTION */}
              <label className="full">
                Mô tả

                <textarea
                  name="description"
                  value={
                    productForm.description
                  }
                  onChange={
                    handleProductChange
                  }
                  rows="4"
                />
              </label>

            </div>

            <div className="admin-form-actions">

              <button
                type="button"
                className="admin-secondary"
                onClick={() =>
                  setShowProductForm(
                    false
                  )
                }
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-primary"
                disabled={
                  savingProduct
                }
              >
                {savingProduct
                  ? "Đang lưu..."
                  : "Lưu sản phẩm"}
              </button>

            </div>

          </form>

        </div>
      )}

    </div>
  );
}