import { Resend } from "resend";
import { Order, RefundRequest } from "./types";

const sentEmails = new Set<string>();

export class EmailService {
  private static getResendClient(): Resend | null {
    const key = process.env.RESEND_API_KEY;
    if (key && key.startsWith("re_")) {
      return new Resend(key);
    }
    return null;
  }

  public static async sendOrderConfirmation(order: Order): Promise<{ success: boolean; messageId?: string; status: string }> {
    const idempotencyKey = `order-email-${order.Order_ID}`;
    if (sentEmails.has(idempotencyKey)) {
      return { success: true, status: "Already sent (deduplicated)" };
    }

    const resend = this.getResendClient();
    const fromAddress = process.env.EMAIL_FROM || "TechMart Support <onboarding@resend.dev>";

    if (!resend) {
      console.log(`[Email Service Simulation] Order Confirmation sent to ${order.Customer_Email} for Order #${order.Order_ID}`);
      sentEmails.add(idempotencyKey);
      return { success: true, messageId: `sim_${Date.now()}`, status: "Simulated (Configure RESEND_API_KEY for live delivery)" };
    }

    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: order.Customer_Email,
        subject: `Order Confirmation: ${order.Order_ID} - TechMart`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a;">Thank you for your order, ${order.Customer_Name}!</h2>
            <p>Your order has been recorded successfully at TechMart.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Order ID:</strong> ${order.Order_ID}</p>
              <p><strong>Item:</strong> ${order.Product_Name} (x${order.Quantity})</p>
              <p><strong>Total Amount:</strong> $${order.Total_Amount.toFixed(2)}</p>
              <p><strong>Order Status:</strong> ${order.Order_Status}</p>
              <p><strong>Payment Status:</strong> ${order.Payment_Status}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">Please keep this Order ID for reference. If you need any assistance, contact support@techmart.com.</p>
          </div>
        `
      });

      sentEmails.add(idempotencyKey);
      return { success: true, messageId: response.data?.id, status: "Sent" };
    } catch (err: any) {
      console.error("Failed to send order email:", err);
      return { success: false, status: `Failed: ${err.message || err}` };
    }
  }

  public static async sendRefundStatusUpdate(refund: RefundRequest, order: Order): Promise<{ success: boolean; messageId?: string; status: string }> {
    const idempotencyKey = `refund-email-${refund.Refund_Request_ID}`;
    if (sentEmails.has(idempotencyKey)) {
      return { success: true, status: "Already sent (deduplicated)" };
    }

    const resend = this.getResendClient();
    const fromAddress = process.env.EMAIL_FROM || "TechMart Support <onboarding@resend.dev>";

    if (!resend) {
      console.log(`[Email Service Simulation] Refund Status Email sent to ${order.Customer_Email} for Refund #${refund.Refund_Request_ID}`);
      sentEmails.add(idempotencyKey);
      return { success: true, messageId: `sim_${Date.now()}`, status: "Simulated (Configure RESEND_API_KEY for live delivery)" };
    }

    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: order.Customer_Email,
        subject: `Refund Request Update: ${refund.Refund_Request_ID} - TechMart`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a;">Refund Request Update</h2>
            <p>Dear ${order.Customer_Name},</p>
            <p>We have evaluated your refund request regarding Order <strong>${order.Order_ID}</strong>.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Refund Request ID:</strong> ${refund.Refund_Request_ID}</p>
              <p><strong>Eligibility Decision:</strong> ${refund.Eligibility_Decision}</p>
              <p><strong>Policy Reference:</strong> ${refund.Policy_Reference}</p>
              <p><strong>Approval Status:</strong> ${refund.Approval_Status}</p>
              <p><strong>Payment Reversal Status:</strong> ${refund.Payment_Reversal_Status}</p>
              <p><strong>Amount:</strong> $${refund.Refund_Amount.toFixed(2)}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">If approved, funds are processed within 5 business days after the returned item is received in original packaging.</p>
          </div>
        `
      });

      sentEmails.add(idempotencyKey);
      return { success: true, messageId: response.data?.id, status: "Sent" };
    } catch (err: any) {
      console.error("Failed to send refund email:", err);
      return { success: false, status: `Failed: ${err.message || err}` };
    }
  }
}
