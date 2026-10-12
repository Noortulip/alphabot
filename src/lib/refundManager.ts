import { LocalStore } from "./localStore";
import { GoogleSheetsService } from "./googleSheets";
import { RagService } from "./rag";
import { Order, RefundRequest } from "./types";

export interface RefundEvaluationResult {
  decision: "APPROVED" | "REJECTED" | "PENDING_REVIEW";
  refundRequestId: string;
  order: Order;
  policyReference: string;
  reasonExplanation: string;
  refundAmount: number;
}

export class RefundManager {
  public static async evaluateAndCreateRefund(params: {
    orderId: string;
    customerEmail: string;
    refundReason: string;
  }): Promise<{ success: boolean; result?: RefundEvaluationResult; error?: string }> {
    // 1. Order Verification
    const order = LocalStore.getOrderById(params.orderId);
    if (!order) {
      return {
        success: false,
        error: `Order with ID "${params.orderId}" could not be found. Please check your Order ID.`
      };
    }

    // Verify email authorization factor
    if (order.Customer_Email.toLowerCase() !== params.customerEmail.trim().toLowerCase()) {
      return {
        success: false,
        error: "Verification failed. The provided email address does not match the order records."
      };
    }

    if (order.Refund_Status === "Approved" || order.Refund_Status === "Processed") {
      return {
        success: false,
        error: `Order ${order.Order_ID} already has an active or approved refund request.`
      };
    }

    // 2. Retrieve Policy Evidence via RAG
    const ragResults = await RagService.retrieveRelevantPolicy(
      `Return policy refund eligibility for ${order.Product_Name} reason: ${params.refundReason}`,
      3
    );

    const topPolicyChunk = ragResults[0]?.chunk;
    const policySection = topPolicyChunk?.section || "Return & Refund Policy";

    // 3. Compute Days since purchase
    const orderDate = new Date(order.Order_Date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - orderDate.getTime());
    const daysSincePurchase = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Determine category return window from TechMart policy:
    // Electronics (Laptops, Phones, Tablets, Audio): 15 days. Non-electronics: 30 days.
    const product = LocalStore.getProductById(order.Product_ID);
    const category = product?.Category?.toLowerCase() || "";
    const isElectronic = ["laptop", "mobile phone", "tablet", "headphones", "speaker"].includes(category) ||
      ["laptop", "phone", "mobile", "tablet", "headphone", "speaker", "lenovo", "macbook"].some(k => 
        order.Product_Name.toLowerCase().includes(k)
      );
    const maxReturnDays = isElectronic ? 15 : 30;

    let decision: "APPROVED" | "REJECTED" | "PENDING_REVIEW" = "PENDING_REVIEW";
    let policyReference = "";
    let reasonExplanation = "";

    if (daysSincePurchase > maxReturnDays) {
      decision = "REJECTED";
      policyReference = `${policySection} - Return window of ${maxReturnDays} days exceeded (${daysSincePurchase} days since purchase).`;
      reasonExplanation = `Under TechMart's Return Policy, ${isElectronic ? "electronics must be returned within 15 days" : "items must be returned within 30 days"} of purchase. Your order was placed ${daysSincePurchase} days ago.`;
    } else if (params.refundReason.toLowerCase().includes("damaged") || params.refundReason.toLowerCase().includes("defective") || params.refundReason.toLowerCase().includes("wrong item")) {
      decision = "APPROVED";
      policyReference = `${policySection} - Eligible for return within ${maxReturnDays} days due to verified condition report.`;
      reasonExplanation = `Your order is within the ${maxReturnDays}-day return window and satisfies the eligibility criteria for defective/damaged item returns.`;
    } else if (daysSincePurchase <= maxReturnDays) {
      decision = "APPROVED";
      policyReference = `${policySection} - Item within ${maxReturnDays}-day return window. Subject to return of unused item in original packaging.`;
      reasonExplanation = `Your order is within the ${maxReturnDays}-day return window. Please note all returned items must be unused and in original packaging.`;
    } else {
      decision = "PENDING_REVIEW";
      policyReference = `${policySection} - Manual review required for special conditions.`;
      reasonExplanation = "Your refund request requires manual review by our customer support management team.";
    }

    // 4. Create Refund Request
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const refundRequestId = `REF-${randomNum}`;

    const refundRequest: RefundRequest = {
      Refund_Request_ID: refundRequestId,
      Order_ID: order.Order_ID,
      Customer_ID: order.Customer_ID,
      Request_Date: new Date().toISOString().split("T")[0],
      Refund_Reason: params.refundReason,
      Refund_Amount: order.Total_Amount,
      Eligibility_Decision: decision,
      Policy_Reference: policyReference,
      Approval_Status: decision === "APPROVED" ? "Approved" : decision === "REJECTED" ? "Rejected" : "Pending Review",
      Payment_Reversal_Status: "Pending", // Must be distinct from approval!
      Email_Status: "Pending",
      Last_Updated: new Date().toISOString()
    };

    // Update order refund status
    LocalStore.updateOrder(order.Order_ID, {
      Refund_Status: decision === "APPROVED" ? "Approved" : decision === "REJECTED" ? "Rejected" : "Requested"
    });

    // Save to Google Sheets & Local store
    await GoogleSheetsService.appendRefund(refundRequest);

    return {
      success: true,
      result: {
        decision,
        refundRequestId,
        order,
        policyReference,
        reasonExplanation,
        refundAmount: order.Total_Amount
      }
    };
  }
}
