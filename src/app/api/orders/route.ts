import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrderManager } from "@/lib/orderManager";
import { EmailService } from "@/lib/emailService";
import { GoogleSheetsService } from "@/lib/googleSheets";
import { LocalStore } from "@/lib/localStore";

const createOrderSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Valid email address is required"),
  idempotencyKey: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { productId, quantity, customerName, customerEmail, idempotencyKey } = parsed.data;

    // Create order deterministically
    const result = await OrderManager.createOrder({
      productId,
      quantity,
      customerName,
      customerEmail,
      idempotencyKey
    });

    if (!result.success || !result.order) {
      return NextResponse.json({ success: false, error: result.error || "Order creation failed" }, { status: 400 });
    }

    const order = result.order;

    // Send confirmation email asynchronously (does not block order creation on email failure)
    let emailStatus = "Pending";
    try {
      const emailRes = await EmailService.sendOrderConfirmation(order);
      emailStatus = emailRes.status;
    } catch (e: any) {
      console.warn("Order email delivery failed:", e);
      emailStatus = `Failed: ${e.message || e}`;
    }

    // Log interaction
    const interactionId = `LOG-${Math.floor(10000 + Math.random() * 90000)}`;
    await GoogleSheetsService.appendLog({
      Interaction_ID: interactionId,
      Timestamp: new Date().toISOString(),
      Session_ID: idempotencyKey || "session-order",
      Customer_ID: customerEmail,
      Intent: "NEW_ORDER",
      Customer_Query: `Order created for ${order.Product_Name} (x${quantity})`,
      Retrieved_Data_Sources: "Google Sheets Products",
      AI_Response: `Order ${order.Order_ID} confirmed. Total: $${order.Total_Amount}. Email: ${emailStatus}`,
      Order_ID: order.Order_ID,
      Action_Status: "SUCCESS"
    });

    return NextResponse.json({
      success: true,
      data: order,
      emailStatus
    });
  } catch (err: any) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred while processing order." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orders = LocalStore.getOrders();
    return NextResponse.json({ success: true, data: orders });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
