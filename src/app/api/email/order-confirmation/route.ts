import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailService } from "@/lib/emailService";
import { LocalStore } from "@/lib/localStore";

const emailOrderSchema = z.object({
  orderId: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = emailOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Valid orderId is required" }, { status: 400 });
    }

    const order = LocalStore.getOrderById(parsed.data.orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const result = await EmailService.sendOrderConfirmation(order);
    return NextResponse.json({ success: result.success, messageId: result.messageId, status: result.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
