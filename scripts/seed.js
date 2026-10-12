const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Authentic 20 Products matching products.xlsx and data/products.json
const INITIAL_PRODUCTS = [
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

const INITIAL_ORDERS = [
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
    Order_Date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
    Order_Date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    Order_Status: "Delivered",
    Payment_Status: "Paid",
    Refund_Status: "None"
  }
];

const INITIAL_CUSTOMERS = [
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
  }
];

fs.writeFileSync(path.join(DATA_DIR, "products.json"), JSON.stringify(INITIAL_PRODUCTS, null, 2));
fs.writeFileSync(path.join(DATA_DIR, "orders.json"), JSON.stringify(INITIAL_ORDERS, null, 2));
fs.writeFileSync(path.join(DATA_DIR, "customers.json"), JSON.stringify(INITIAL_CUSTOMERS, null, 2));
fs.writeFileSync(path.join(DATA_DIR, "refunds.json"), JSON.stringify([], null, 2));
fs.writeFileSync(path.join(DATA_DIR, "logs.json"), JSON.stringify([], null, 2));

console.log("Full seed catalog written to data/ directory successfully.");
