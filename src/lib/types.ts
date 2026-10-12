export interface Product {
  Product_ID: string;
  Product_Name: string;
  Description: string;
  Category: string;
  Unit_Price: number;
  Discount: string; // e.g. "10%" or "$0"
  Promotion: string; // e.g. "TECH10 for 10% off"
  Stock_Quantity: number;
  Product_Status: "Active" | "Out of Stock" | "Discontinued";
}

export interface Order {
  Order_ID: string;
  Customer_ID: string;
  Customer_Name: string;
  Customer_Email: string;
  Product_ID: string;
  Product_Name: string;
  Quantity: number;
  Unit_Price: number;
  Discount_Amount: number;
  Total_Amount: number;
  Order_Date: string;
  Order_Status: "Confirmed" | "Pending Payment" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  Payment_Status: "Pending Payment" | "Pending" | "Paid" | "Failed" | "Refunded";
  Refund_Status: "None" | "Requested" | "Approved" | "Rejected" | "Processed";
}

export interface Customer {
  Customer_ID: string;
  Customer_Name: string;
  Customer_Email: string;
  Contact_Information: string;
}

export interface RefundRequest {
  Refund_Request_ID: string;
  Order_ID: string;
  Customer_ID: string;
  Request_Date: string;
  Refund_Reason: string;
  Refund_Amount: number;
  Eligibility_Decision: "APPROVED" | "REJECTED" | "PENDING_REVIEW";
  Policy_Reference: string;
  Approval_Status: "Approved" | "Rejected" | "Pending Review";
  Payment_Reversal_Status: "Pending" | "Processing" | "Completed" | "Not Applicable";
  Email_Status: "Sent" | "Pending" | "Failed";
  Last_Updated: string;
}

export interface InteractionLog {
  Interaction_ID: string;
  Timestamp: string;
  Session_ID: string;
  Customer_ID?: string;
  Intent: "PRODUCT_INQUIRY" | "PRICE_DISCOUNT" | "ORDER_STATUS" | "NEW_ORDER" | "REFUND_REQUEST" | "POLICY_QUESTION" | "GENERAL";
  Customer_Query: string;
  Retrieved_Data_Sources: string;
  AI_Response: string;
  Order_ID?: string;
  Refund_Request_ID?: string;
  Action_Status: "SUCCESS" | "INFO_REQUIRED" | "FAILED" | "REJECTED";
  Error_Details?: string;
}

export interface PolicyChunk {
  id: string;
  section: string;
  content: string;
  sourceDoc: string;
  embedding?: number[];
}

export interface PolicyIngestionMeta {
  fileName: string;
  version: string;
  ingestedAt: string;
  totalChunks: number;
  status: "READY" | "INDEXING" | "FAILED";
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "alpha" | "system";
  text: string;
  timestamp: string;
  orderSummary?: {
    orderId?: string;
    productName: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalAmount: number;
    customerName: string;
    customerEmail: string;
    isConfirmed?: boolean;
    orderStatus?: string;
  };
  productCards?: Product[];
  orderCard?: Order;
  refundCard?: RefundRequest;
  policyCitation?: string;
}
