import { GoogleSheetsService } from "./googleSheets";
import { LocalStore } from "./localStore";
import { Order, Product } from "./types";

// In-memory idempotency cache (keyed by idempotencyKey or hash of order data)
const processedOrders = new Map<string, { order: Order; timestamp: number }>();

export interface OrderCalculationResult {
  valid: boolean;
  error?: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  appliedPromotion?: string;
}

export class OrderManager {
  public static calculateOrder(product: Product, quantity: number): OrderCalculationResult {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { valid: false, error: "Quantity must be a positive integer.", quantity, unitPrice: product.Unit_Price, subtotal: 0, discountAmount: 0, deliveryCharge: 0, totalAmount: 0 };
    }

    if (product.Product_Status !== "Active" || product.Stock_Quantity < quantity) {
      return {
        valid: false,
        error: `Insufficient stock for "${product.Product_Name}". Available stock is ${product.Stock_Quantity}.`,
        product,
        quantity,
        unitPrice: product.Unit_Price,
        subtotal: 0,
        discountAmount: 0,
        deliveryCharge: 0,
        totalAmount: 0
      };
    }

    const unitPrice = product.Unit_Price;
    const subtotal = Math.round(unitPrice * quantity * 100) / 100;

    // Deterministic discount calculation
    let discountAmount = 0;
    if (product.Discount) {
      const match = product.Discount.match(/(\d+)%/);
      if (match) {
        const percent = parseFloat(match[1]);
        discountAmount = Math.round((subtotal * (percent / 100)) * 100) / 100;
      }
    }

    // Shipping policy from TechMart: Standard shipping is $4.99, or FREE on orders above $50
    const deliveryCharge = (subtotal - discountAmount) >= 50 ? 0.00 : 4.99;
    const totalAmount = Math.round(((subtotal - discountAmount) + deliveryCharge) * 100) / 100;

    return {
      valid: true,
      product,
      quantity,
      unitPrice,
      subtotal,
      discountAmount,
      deliveryCharge,
      totalAmount,
      appliedPromotion: product.Promotion || undefined
    };
  }

  public static async createOrder(params: {
    productId: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    // 1. Idempotency Check
    if (params.idempotencyKey && processedOrders.has(params.idempotencyKey)) {
      const cached = processedOrders.get(params.idempotencyKey)!;
      return { success: true, order: cached.order };
    }

    // 2. Fetch latest product data
    const products = await GoogleSheetsService.getProducts();
    const cleanId = params.productId.trim().toLowerCase();
    const product = products.find(p => p.Product_ID.toLowerCase() === cleanId || p.Product_Name.toLowerCase().includes(cleanId));

    if (!product) {
      return { success: false, error: `Product not found with identifier "${params.productId}".` };
    }

    // 3. Re-calculate & validate immediately before commit
    const calc = this.calculateOrder(product, params.quantity);
    if (!calc.valid) {
      return { success: false, error: calc.error };
    }

    // 4. Generate unique Order ID and Customer ID
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `TM-${randomNum}`;
    const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      Order_ID: orderId,
      Customer_ID: customerId,
      Customer_Name: params.customerName.trim(),
      Customer_Email: params.customerEmail.trim().toLowerCase(),
      Product_ID: product.Product_ID,
      Product_Name: product.Product_Name,
      Quantity: params.quantity,
      Unit_Price: calc.unitPrice,
      Discount_Amount: calc.discountAmount,
      Total_Amount: calc.totalAmount,
      Order_Date: new Date().toISOString().split("T")[0],
      Order_Status: "Confirmed",
      Payment_Status: "Pending Payment", // Distinguish clearly: order is created, payment is pending
      Refund_Status: "None"
    };

    // 5. Atomic stock deduction
    const stockUpdated = LocalStore.updateProductStock(product.Product_ID, params.quantity);
    if (!stockUpdated) {
      return { success: false, error: "Failed to allocate inventory. Another customer may have reserved the items." };
    }

    // 6. Append to Google Sheets and Local Store
    const saved = await GoogleSheetsService.appendOrder(newOrder);
    if (!saved) {
      console.warn("Order saved locally but Google Sheets write returned false.");
    }

    // Save customer record
    LocalStore.saveCustomer({
      Customer_ID: customerId,
      Customer_Name: params.customerName.trim(),
      Customer_Email: params.customerEmail.trim().toLowerCase(),
      Contact_Information: "Email Verified"
    });

    // 7. Store idempotency key
    if (params.idempotencyKey) {
      processedOrders.set(params.idempotencyKey, { order: newOrder, timestamp: Date.now() });
    }

    return { success: true, order: newOrder };
  }
}
