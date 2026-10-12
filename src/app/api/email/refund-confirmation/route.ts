import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailService } from "@/lib/emailService";
import { LocalStore } from "@/lib/localStore";

const emailRefundSchema = z.object({
  refundRequestId: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = emailRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Valid refundRequestId is required" }, { status: 400 });
    }

    const refund = LocalStore.getRefundById(parsed.data.refundRequestId);
    if (!refund) {
      return NextResponse.json({ success: false, error: "Refund request not found" }, { status: 404 });
    }

    const order = LocalStore.getOrderById(refund.Order_ID);
    if (!order) {
      return NextResponse.json({ success: false, error: "Associated order not found" }, { status: 404 });
    }

    const result = await EmailService.sendRefundStatusUpdate(refund, order);
    return NextResponse.json({ success: result.success, messageId: result.messageId, status: result.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
