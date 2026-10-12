import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RefundManager } from "@/lib/refundManager";
import { EmailService } from "@/lib/emailService";
import { GoogleSheetsService } from "@/lib/googleSheets";
import { LocalStore } from "@/lib/localStore";

const refundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  customerEmail: z.string().email("Valid email address is required"),
  refundReason: z.string().min(3, "Refund reason is required")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { orderId, customerEmail, refundReason } = parsed.data;

    const evaluation = await RefundManager.evaluateAndCreateRefund({
      orderId,
      customerEmail,
      refundReason
    });

    if (!evaluation.success || !evaluation.result) {
      return NextResponse.json({ success: false, error: evaluation.error || "Refund evaluation failed." }, { status: 400 });
    }

    const { decision, refundRequestId, order, policyReference, reasonExplanation, refundAmount } = evaluation.result;

    const refundRecord = LocalStore.getRefundById(refundRequestId);
    let emailStatus = "Pending";
    if (refundRecord) {
      try {
        const emailRes = await EmailService.sendRefundStatusUpdate(refundRecord, order);
        emailStatus = emailRes.status;
      } catch (e: any) {
        console.warn("Refund email failed:", e);
        emailStatus = `Failed: ${e.message || e}`;
      }
    }

    // Log interaction
    const interactionId = `LOG-${Math.floor(10000 + Math.random() * 90000)}`;
    await GoogleSheetsService.appendLog({
      Interaction_ID: interactionId,
      Timestamp: new Date().toISOString(),
      Session_ID: "session-refund",
      Customer_ID: customerEmail,
      Intent: "REFUND_REQUEST",
      Customer_Query: `Refund requested for ${orderId}: "${refundReason}"`,
      Retrieved_Data_Sources: `DOCX RAG Policy (${policyReference})`,
      AI_Response: `Decision: ${decision}. Ref: ${refundRequestId}. Policy: ${policyReference}`,
      Order_ID: orderId,
      Refund_Request_ID: refundRequestId,
      Action_Status: decision === "APPROVED" ? "SUCCESS" : decision === "REJECTED" ? "REJECTED" : "INFO_REQUIRED"
    });

    return NextResponse.json({
      success: true,
      data: {
        decision,
        refundRequestId,
        orderId,
        refundAmount,
        policyReference,
        reasonExplanation,
        approvalStatus: refundRecord?.Approval_Status || "Pending Review",
        paymentReversalStatus: "Pending", // Important: clearly distinguished from approval!
        emailStatus
      }
    });
  } catch (err: any) {
    console.error("Refund API error:", err);
    return NextResponse.json({ success: false, error: "Error processing refund request." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const refunds = LocalStore.getRefunds();
    return NextResponse.json({ success: true, data: refunds });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Failed to fetch refund requests" }, { status: 500 });
  }
}
