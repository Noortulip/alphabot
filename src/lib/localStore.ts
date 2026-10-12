import fs from "fs";
import path from "path";
import { Product, Order, Customer, RefundRequest, InteractionLog } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(filename: string): string {
  ensureDirectoryExists();
  return path.join(DATA_DIR, filename);
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  const filePath = getFilePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Authentic TechMart Products matching products.xlsx and live data/products.json
const INITIAL_PRODUCTS: Product[] = [
  {
    Product_ID: "PROD-001",
    Product_Name: "Apple MacBook Air M3",
    Brand: "Apple",
    Description: "13.6\", Apple M3, 16GB RAM, 512GB SSD. Best for: Students & Professionals",
    Category: "Laptop",
    Unit_Price: 799.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 8,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-002",
    Product_Name: "Dell XPS 15 9530",
    Brand: "Dell",
    Description: "Intel Core i7, RTX 4050, 16GB RAM. Best for: Creators & Office Work",
    Category: "Laptop",
    Unit_Price: 149.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 0,
    Product_Status: "Out of Stock"
  },
  {
    Product_ID: "PROD-003",
    Product_Name: "Lenovo Legion Pro 5",
    Brand: "Lenovo",
    Description: "Ryzen 9, RTX 4070, 32GB RAM. Best for: Gaming",
    Category: "Laptop",
    Unit_Price: 499.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 15,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-004",
    Product_Name: "HP Spectre x360 14",
    Brand: "HP",
    Description: "OLED Touchscreen, Intel Evo. Best for: Business & Travel",
    Category: "Laptop",
    Unit_Price: 329.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 4,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-005",
    Product_Name: "Sony WH-1000XM5",
    Brand: "Sony",
    Description: "Noise Cancelling, 30hr Battery. Best for: Music & Travel",
    Category: "Headphones",
    Unit_Price: 59.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 22,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-006",
    Product_Name: "Apple AirPods Max",
    Brand: "Apple",
    Description: "Spatial Audio, Premium Build. Best for: Apple Ecosystem",
    Category: "Headphones",
    Unit_Price: 29.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 35,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-007",
    Product_Name: "Bose QuietComfort Ultra",
    Brand: "Bose",
    Description: "ANC, Comfortable Fit. Best for: Frequent Travelers",
    Category: "Headphones",
    Unit_Price: 799.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 8,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-008",
    Product_Name: "Samsung Galaxy S25 Ultra",
    Brand: "Samsung",
    Description: "Snapdragon 8 Gen 4, 200MP Camera. Best for: Photography",
    Category: "Phone",
    Unit_Price: 149.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 0,
    Product_Status: "Out of Stock"
  },
  {
    Product_ID: "PROD-009",
    Product_Name: "Apple iPhone 16 Pro Max",
    Brand: "Apple",
    Description: "A18 Pro Chip, Titanium Design. Best for: Premium Users",
    Category: "Phone",
    Unit_Price: 499.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 15,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-010",
    Product_Name: "Google Pixel 9 Pro",
    Brand: "Google",
    Description: "AI Features, Excellent Camera. Best for: Android Users",
    Category: "Phone",
    Unit_Price: 329.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 4,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-011",
    Product_Name: "OnePlus OnePlus 13",
    Brand: "OnePlus",
    Description: "Fast Charging, AMOLED Display. Best for: Performance",
    Category: "Phone",
    Unit_Price: 59.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 22,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-012",
    Product_Name: "Apple iPad Pro M4",
    Brand: "Apple",
    Description: "OLED Display, Apple Pencil Pro. Best for: Designers",
    Category: "Tablet",
    Unit_Price: 29.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 35,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-013",
    Product_Name: "Samsung Galaxy Tab S10 Ultra",
    Brand: "Samsung",
    Description: "14.6\" AMOLED, S-Pen. Best for: Entertainment",
    Category: "Tablet",
    Unit_Price: 799.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 8,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-014",
    Product_Name: "Xiaomi Pad 7 Pro",
    Brand: "Xiaomi",
    Description: "Snapdragon Processor, 144Hz. Best for: Budget Premium",
    Category: "Tablet",
    Unit_Price: 149.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 0,
    Product_Status: "Out of Stock"
  },
  {
    Product_ID: "PROD-015",
    Product_Name: "Logitech MX Keys S",
    Brand: "Logitech",
    Description: "Wireless, Backlit Keys. Best for: Productivity",
    Category: "Keyboard",
    Unit_Price: 499.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 15,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-016",
    Product_Name: "Keychron Keychron K8 Pro",
    Brand: "Keychron",
    Description: "Mechanical, Hot-Swappable. Best for: Programmers",
    Category: "Keyboard",
    Unit_Price: 329.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 4,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-017",
    Product_Name: "Razer BlackWidow V4",
    Brand: "Razer",
    Description: "RGB Mechanical Keyboard. Best for: Gamers",
    Category: "Keyboard",
    Unit_Price: 59.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 22,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-018",
    Product_Name: "Logitech MX Master 3S",
    Brand: "Logitech",
    Description: "Ergonomic, Silent Clicks. Best for: Office & Editing",
    Category: "Mouse",
    Unit_Price: 29.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 35,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-019",
    Product_Name: "Razer DeathAdder V3 Pro",
    Brand: "Razer",
    Description: "Lightweight, Wireless Gaming. Best for: Esports",
    Category: "Mouse",
    Unit_Price: 499.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 4,
    Product_Status: "Active"
  },
  {
    Product_ID: "PROD-020",
    Product_Name: "SteelSeries Aerox 5 Wireless",
    Brand: "SteelSeries",
    Description: "Ultra-Lightweight, RGB. Best for: Gaming & Streaming",
    Category: "Mouse",
    Unit_Price: 329.99,
    Discount: "0%",
    Promotion: "",
    Stock_Quantity: 22,
    Product_Status: "Active"
  }
];

// Initial Orders for testing verification and refunds
const INITIAL_ORDERS: Order[] = [
  {
    Order_ID: "TM-1001",
    Customer_ID: "CUST-001",
    Customer_Name: "John Doe",
    Customer_Email: "john@example.com",
    Product_ID: "PROD-001",
    Product_Name: "Apple MacBook Air M3",
    Quantity: 1,
    Unit_Price: 799.99,
    Discount_Amount: 80.00,
    Total_Amount: 719.99,
    Order_Date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 5 days ago (Within 15 days electronic return window!)
    Order_Status: "Delivered",
    Payment_Status: "Paid",
    Refund_Status: "None"
  },
  {
    Order_ID: "TM-1002",
    Customer_ID: "CUST-002",
    Customer_Name: "Sarah Smith",
    Customer_Email: "sarah@example.com",
    Product_ID: "PROD-002",
    Product_Name: "Lenovo Legion Pro 5",
    Quantity: 1,
    Unit_Price: 1399.99,
    Discount_Amount: 70.00,
    Total_Amount: 1329.99,
    Order_Date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 25 days ago (Exceeds 15-day electronics return window!)
    Order_Status: "Delivered",
    Payment_Status: "Paid",
    Refund_Status: "None"
  },
  {
    Order_ID: "TM-1003",
    Customer_ID: "CUST-003",
    Customer_Name: "Alex Rivera",
    Customer_Email: "alex@example.com",
    Product_ID: "PROD-010",
    Product_Name: "Sony WH-1000XM5 Wireless Headphones",
    Quantity: 1,
    Unit_Price: 349.99,
    Discount_Amount: 52.50,
    Total_Amount: 297.49,
    Order_Date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    Order_Status: "Shipped",
    Payment_Status: "Paid",
    Refund_Status: "None"
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    Customer_ID: "CUST-001",
    Customer_Name: "John Doe",
    Customer_Email: "john@example.com",
    Contact_Information: "+1 555-0101"
  },
  {
    Customer_ID: "CUST-002",
    Customer_Name: "Sarah Smith",
    Customer_Email: "sarah@example.com",
    Contact_Information: "+1 555-0102"
  },
  {
    Customer_ID: "CUST-003",
    Customer_Name: "Alex Rivera",
    Customer_Email: "alex@example.com",
    Contact_Information: "+1 555-0103"
  }
];

export const LocalStore = {
  getProducts(): Product[] {
    return readJsonFile<Product[]>("products.json", INITIAL_PRODUCTS);
  },

  getProductById(id: string): Product | undefined {
    const products = this.getProducts();
    const cleanId = id.trim().toLowerCase();
    return products.find(p => p.Product_ID.toLowerCase() === cleanId || p.Product_Name.toLowerCase().includes(cleanId));
  },

  updateProductStock(productId: string, quantitySold: number): boolean {
    const products = this.getProducts();
    const product = products.find(p => p.Product_ID === productId);
    if (!product) return false;
    if (product.Stock_Quantity < quantitySold) return false;

    product.Stock_Quantity -= quantitySold;
    if (product.Stock_Quantity === 0) {
      product.Product_Status = "Out of Stock";
    }
    writeJsonFile("products.json", products);
    return true;
  },

  setProducts(products: Product[]): void {
    writeJsonFile("products.json", products);
  },

  getOrders(): Order[] {
    return readJsonFile<Order[]>("orders.json", INITIAL_ORDERS);
  },

  getOrderById(orderId: string): Order | undefined {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase();
    return orders.find(o => o.Order_ID.toUpperCase() === cleanId);
  },

  createOrder(order: Order): void {
    const orders = this.getOrders();
    orders.unshift(order);
    writeJsonFile("orders.json", orders);
  },

  updateOrder(orderId: string, updates: Partial<Order>): boolean {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.Order_ID.toUpperCase() === orderId.trim().toUpperCase());
    if (index === -1) return false;
    orders[index] = { ...orders[index], ...updates };
    writeJsonFile("orders.json", orders);
    return true;
  },

  getCustomers(): Customer[] {
    return readJsonFile<Customer[]>("customers.json", INITIAL_CUSTOMERS);
  },

  saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const exists = customers.find(c => c.Customer_Email.toLowerCase() === customer.Customer_Email.toLowerCase());
    if (!exists) {
      customers.push(customer);
      writeJsonFile("customers.json", customers);
    }
  },

  getRefunds(): RefundRequest[] {
    return readJsonFile<RefundRequest[]>("refunds.json", []);
  },

  getRefundById(refundId: string): RefundRequest | undefined {
    const refunds = this.getRefunds();
    return refunds.find(r => r.Refund_Request_ID.toUpperCase() === refundId.trim().toUpperCase());
  },

  createRefund(refund: RefundRequest): void {
    const refunds = this.getRefunds();
    refunds.unshift(refund);
    writeJsonFile("refunds.json", refunds);
  },

  updateRefund(refundId: string, updates: Partial<RefundRequest>): boolean {
    const refunds = this.getRefunds();
    const index = refunds.findIndex(r => r.Refund_Request_ID.toUpperCase() === refundId.trim().toUpperCase());
    if (index === -1) return false;
    refunds[index] = { ...refunds[index], ...updates };
    writeJsonFile("refunds.json", refunds);
    return true;
  },

  getLogs(): InteractionLog[] {
    return readJsonFile<InteractionLog[]>("logs.json", []);
  },

  addLog(log: InteractionLog): void {
    const logs = this.getLogs();
    logs.unshift(log);
    // Keep max 500 recent logs
    if (logs.length > 500) logs.pop();
    writeJsonFile("logs.json", logs);
  }
};
