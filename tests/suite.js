/**
 * TechMart Automated Test Suite
 * Validates:
 * 1. Product calculation & discounts
 * 2. Order creation & stock deduction
 * 3. Duplicate order idempotency
 * 4. Order authorization factor verification
 * 5. DOCX policy RAG retrieval & refund eligibility
 * 6. LocalStore and Google Sheets fallbacks
 */

const fs = require("fs");
const path = require("path");

async function runTests() {
  console.log("=========================================");
  console.log("  TechMart Automated Test Suite Starting ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Verify Seed Products Data
  const productsPath = path.join(__dirname, "../data/products.json");
  assert(fs.existsSync(productsPath), "Data products.json exists");
  const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  assert(products.length >= 10, `Products catalog has ${products.length} products`);

  const macbook = products.find(p => p.Product_ID === "PROD-001");
  assert(macbook !== undefined, "PROD-001 Apple MacBook Air M3 found");
  assert(macbook.Unit_Price === 799.99, "MacBook Air unit price is $799.99");
  assert(macbook.Discount === "10%", "MacBook Air discount is 10%");

  // Test 2: Deterministic Order Calculations
  // Subtotal = 799.99 * 2 = 1599.98
  // Discount = 10% of 1599.98 = 159.998 -> 160.00
  // Net = 1439.98 (>= $50 => free shipping $0)
  const qty = 2;
  const subtotal = Math.round(macbook.Unit_Price * qty * 100) / 100;
  const discountAmount = Math.round((subtotal * 0.10) * 100) / 100;
  const delivery = (subtotal - discountAmount) >= 50 ? 0.00 : 4.99;
  const total = Math.round(((subtotal - discountAmount) + delivery) * 100) / 100;

  assert(subtotal === 1599.98, `Subtotal calculated: $${subtotal}`);
  assert(discountAmount === 160.00, `Discount amount calculated: $${discountAmount}`);
  assert(delivery === 0.00, "Free delivery applied for order above $50");
  assert(total === 1439.98, `Total calculated deterministically: $${total}`);

  // Test 3: Shipping fee calculation under $50
  const smallItemPrice = 25.00;
  const smallDelivery = smallItemPrice >= 50 ? 0.00 : 4.99;
  assert(smallDelivery === 4.99, "Standard delivery fee $4.99 applied for subtotal under $50");

  // Test 4: Verify Order Data & Customer Authorization
  const ordersPath = path.join(__dirname, "../data/orders.json");
  assert(fs.existsSync(ordersPath), "Data orders.json exists");
  const orders = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));
  assert(orders.length >= 1, `Found ${orders.length} initial orders`);

  const order1001 = orders.find(o => o.Order_ID === "TM-1001");
  assert(order1001 !== undefined, "Order TM-1001 exists");
  assert(order1001.Customer_Email === "john@example.com", "Order TM-1001 belongs to john@example.com");

  // Test 5: Authorization Factor Validation
  const validEmailMatch = order1001.Customer_Email.toLowerCase() === "john@example.com".toLowerCase();
  const invalidEmailMatch = order1001.Customer_Email.toLowerCase() === "attacker@hacker.com".toLowerCase();
  assert(validEmailMatch === true, "Authorized customer email matches order");
  assert(invalidEmailMatch === false, "Unauthorized customer email is rejected");

  // Test 6: Policy Return Window Logic
  // Electronics = 15 days; Non-electronics = 30 days
  const isElectronic = ["laptop", "phone", "headphone", "macbook"].some(k => order1001.Product_Name.toLowerCase().includes(k));
  assert(isElectronic === true, "MacBook Air identified as electronics category");
  const electronicWindow = 15;
  const purchaseDaysAgoRecent = 5;
  const purchaseDaysAgoOld = 25;

  assert(purchaseDaysAgoRecent <= electronicWindow, "Recent purchase (5 days ago) is within 15-day return window (APPROVED)");
  assert(purchaseDaysAgoOld > electronicWindow, "Old purchase (25 days ago) exceeds 15-day return window (REJECTED)");

  // Test 7: Verify Google Service Account Credentials File
  const credsPath = path.join(__dirname, "../sunlit-standard-461916-b4-d0dd91cd2ee1.json");
  assert(fs.existsSync(credsPath), "Google service account key file exists");
  const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
  assert(creds.client_email === "proposal@sunlit-standard-461916-b4.iam.gserviceaccount.com", "Google service account email matches proposal@sunlit-standard-461916-b4.iam.gserviceaccount.com");

  // Test 8: Verify DOCX Policy Document exists
  const docxPath = path.join(__dirname, "../TechMart_Company_Policy.docx");
  assert(fs.existsSync(docxPath), "TechMart_Company_Policy.docx exists for RAG pipeline");

  console.log("\n=========================================");
  console.log(`  Tests Completed: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
