import { NextRequest, NextResponse } from "next/server";
import { LocalStore } from "@/lib/localStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const order = LocalStore.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: `Order ${orderId} not found.` }, { status: 404 });
    }

    // Security Authorization: Order ID alone must not disclose private records
    if (!email) {
      return NextResponse.json({
        success: false,
        error: "Verification required. Please provide the customer email associated with this order.",
        requiresEmailVerification: true
      }, { status: 403 });
    }

    if (order.Customer_Email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: "Verification failed: Provided email address does not match order records.",
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Error retrieving order details." }, { status: 500 });
  }
}
