import { GoogleGenerativeAI } from "@google/generative-ai";
import { Product, Order, PolicyChunk } from "./types";
import { RagService } from "./rag";
import { GoogleSheetsService } from "./googleSheets";
import { LocalStore } from "./localStore";
import { OrderManager } from "./orderManager";

const SYSTEM_PROMPT = `
You are Alpha, TechMart's AI customer-support assistant.
Your job is to help customers using verified business data, official company policies, and authorized application tools.

General behavior:
1. Be friendly, professional, and concise.
2. Answer the customer's actual question directly with verified real-time numbers.
3. Use real-time Google Sheets data for current products, prices, discounts, promotions, inventory, customer records, and order records.
4. Google Sheets data is retrieved in real-time, NEVER cached in vector databases.
5. Use retrieved company policy passages from RAG for refund and policy questions.
6. Never fabricate prices, stock quantities, order records, or discounts.
7. If asked about quantities or prices, calculate and state the exact numbers clearly.
`;

export interface AgentResponse {
  text: string;
  intent: "PRODUCT_INQUIRY" | "PRICE_DISCOUNT" | "ORDER_STATUS" | "NEW_ORDER" | "REFUND_REQUEST" | "POLICY_QUESTION" | "GENERAL";
  productCards?: Product[];
  orderSummary?: any;
  orderCard?: Order;
  policyCitation?: string;
}

// Category mappings for robust customer queries
const CATEGORY_MAP: Record<string, string> = {
  "laptop": "Laptop",
  "laptops": "Laptop",
  "notebook": "Laptop",
  "notebooks": "Laptop",
  "macbook": "Laptop",
  "phone": "Mobile Phone",
  "phones": "Mobile Phone",
  "mobile": "Mobile Phone",
  "mobiles": "Mobile Phone",
  "smartphone": "Mobile Phone",
  "smartphones": "Mobile Phone",
  "cellphone": "Mobile Phone",
  "tablet": "Tablet",
  "tablets": "Tablet",
  "ipad": "Tablet",
  "ipads": "Tablet",
  "headphone": "Headphones",
  "headphones": "Headphones",
  "earphone": "Headphones",
  "earphones": "Headphones",
  "headset": "Headphones",
  "airpods": "Headphones",
  "speaker": "Speaker",
  "speakers": "Speaker",
  "soundbar": "Speaker",
  "keyboard": "Keyboard",
  "keyboards": "Keyboard",
  "mouse": "Mouse",
  "mice": "Mouse"
};

export class GeminiAgent {
  public static async processMessage(
    userMessage: string,
    history: { role: "user" | "model"; content: string }[] = [],
    sessionContext?: any
  ): Promise<AgentResponse> {
    const rawQuery = userMessage.trim().toLowerCase();

    // 1. Fetch real-time live product catalog directly from Google Sheets / live store
    // NOTE: Product and order data is fetched in REAL TIME, NEVER indexed in Chroma DB!
    const products = await GoogleSheetsService.getProducts();

    // 2. Retrieve relevant policy chunks from RAG (Policies only)
    const policyResults = await RagService.retrieveRelevantPolicy(userMessage, 3);
    const policyContext = policyResults
      .map(r => `[Section: ${r.chunk.section}]\n${r.chunk.content}`)
      .join("\n\n");
    const topCitation = policyResults[0]?.chunk.section;

    // 3. Build and LOG the exact context string sent to Gemini for EACH question
    const geminiContextPrompt = `
Verified Live TechMart Inventory (Real-Time Google Sheets, ZERO ChromaDB vector caching):
${products.map(p => `- [${p.Product_ID}] ${p.Product_Name} ($${p.Unit_Price.toFixed(2)}, Stock: ${p.Stock_Quantity}, Discount: ${p.Discount || "0%"}, Category: ${p.Category}, Specs: ${p.Description})`).join("\n")}

Retrieved Company Policy Documents (RAG - Policies Only):
${policyContext || "No policy documents retrieved for this query."}

Customer Question:
${userMessage}
`.trim();

    console.log(`\n================================================================================`);
    console.log(`=== [GEMINI AGENT] EXACT CONTEXT STRING SENT TO GEMINI (PROMPT) ===`);
    console.log(`=== TIMESTAMP: ${new Date().toISOString()}`);
    console.log(`=== CUSTOMER QUERY: "${userMessage}"`);
    console.log(`=== DATA SOURCE: ${GoogleSheetsService.getSpreadsheetId() ? "Google Sheets (Live v4 API)" : "Live Real-Time Store"}`);
    console.log(`================================================================================`);
    console.log(geminiContextPrompt);
    console.log(`================================================================================\n`);

    // 3. Detect intent
    let intent: AgentResponse["intent"] = "GENERAL";

    // ==========================================
    // INTENT: ORDER TRACKING
    // ==========================================
    const orderMatch = userMessage.match(/\b(TM-\d{4,6})\b/i);
    const emailMatch = userMessage.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/);

    if (rawQuery.includes("where is my order") || rawQuery.includes("order status") || (orderMatch && !rawQuery.includes("refund") && !rawQuery.includes("return"))) {
      intent = "ORDER_STATUS";
      if (orderMatch) {
        const orderId = orderMatch[1].toUpperCase();
        const order = LocalStore.getOrderById(orderId);
        if (order) {
          if (emailMatch) {
            if (order.Customer_Email.toLowerCase() === emailMatch[1].toLowerCase()) {
              return {
                text: `Here are the verified real-time details for Order **${order.Order_ID}**:\n\n• **Product:** ${order.Product_Name} (Qty: ${order.Quantity})\n• **Order Date:** ${order.Order_Date}\n• **Order Status:** ${order.Order_Status}\n• **Payment Status:** ${order.Payment_Status}\n• **Total Paid:** $${order.Total_Amount.toFixed(2)}\n• **Refund Status:** ${order.Refund_Status}`,
                intent,
                orderCard: order
              };
            } else {
              return {
                text: `Verification failed. The email address **${emailMatch[1]}** does not match our records for Order **${orderId}**. For customer security, please verify the exact email used during checkout.`,
                intent
              };
            }
          } else {
            return {
              text: `I located Order **${orderId}** in our real-time database. To protect customer privacy, please provide the email address associated with this order so I can verify your authorization.`,
              intent
            };
          }
        } else {
          return {
            text: `I could not find any order matching ID **${orderId}** in our live records. Please double-check your Order ID (format: TM-XXXXX) or contact support@techmart.com.`,
            intent
          };
        }
      } else {
        return {
          text: "I can look up your real-time order status right away. Please provide your **Order ID** (e.g., TM-1001) and associated **email address**.",
          intent
        };
      }
    }

    // ==========================================
    // INTENT: REFUND & POLICY (Grounded via DOCX RAG)
    // ==========================================
    if (rawQuery.includes("refund") || rawQuery.includes("return policy") || rawQuery.includes("exchange policy") || (rawQuery.includes("return") && (rawQuery.includes("how") || rawQuery.includes("policy") || rawQuery.includes("days") || rawQuery.includes("order")))) {
      intent = "REFUND_REQUEST";
      if (orderMatch && emailMatch) {
        const orderId = orderMatch[1].toUpperCase();
        return {
          text: `I have received your refund evaluation request for Order **${orderId}**. You can submit this evaluation directly in our system.`,
          intent,
          policyCitation: topCitation
        };
      } else if (!orderMatch) {
        return {
          text: `Under TechMart's Return Policy, customers may return items within **30 days** of purchase (**15 days for electronics** like laptops, phones, and headphones). Items must be unused and in original packaging.\n\nTo evaluate your refund eligibility, please provide:\n1. Your **Order ID** (e.g. TM-1001)\n2. Your **Email address**\n3. The **Reason for return**`,
          intent,
          policyCitation: "Return Policy"
        };
      }
    }

    // ==========================================
    // INTENT: PURCHASE / PLACE ORDER
    // ==========================================
    const isBuyIntent = rawQuery.includes("buy") ||
      rawQuery.includes("purchase") ||
      rawQuery.includes("want to order") ||
      rawQuery.includes("place an order") ||
      rawQuery.includes("place order") ||
      (rawQuery.includes("i want") && (rawQuery.includes("order") || rawQuery.includes("buy") || rawQuery.includes("get")));

    if (isBuyIntent) {
      intent = "NEW_ORDER";

      // 1. Find product matching query
      const matchedProduct = this.findBestProductMatch(rawQuery, products);

      if (matchedProduct) {
        // Parse explicit quantity (e.g., "order 2", "buy 3 units", "2 phones")
        // NEVER match numbers in product names like "Pixel 8", "S24", "15 Pro"
        const qty = this.parseExplicitQuantity(userMessage);

        const calc = OrderManager.calculateOrder(matchedProduct, qty);

        if (!calc.valid) {
          return {
            text: `I checked real-time availability for **${matchedProduct.Product_Name}**, but unfortunately ${calc.error}\n\nCurrent real-time stock: **${matchedProduct.Stock_Quantity} unit(s)** available.`,
            intent,
            productCards: [matchedProduct]
          };
        }

        return {
          text: `Sure! I verified current real-time price and stock for **${matchedProduct.Product_Name}** from our live database.\n\nHere is your verified **Order Summary** before purchase:\n• **Product:** ${matchedProduct.Product_Name}\n• **Quantity:** ${qty}\n• **Unit Price:** $${calc.unitPrice.toFixed(2)}\n• **Discount:** -$${calc.discountAmount.toFixed(2)}${matchedProduct.Promotion ? ` (${matchedProduct.Promotion})` : ""}\n• **Delivery Fee:** $${calc.deliveryCharge.toFixed(2)} (${calc.deliveryCharge === 0 ? "FREE Standard Shipping" : "Standard 3-5 days"})\n• **Order Total:** **$${calc.totalAmount.toFixed(2)}**\n\nTo complete this order and add it to our live records, please confirm below:`,
          intent,
          orderSummary: {
            productId: matchedProduct.Product_ID,
            productName: matchedProduct.Product_Name,
            quantity: qty,
            unitPrice: calc.unitPrice,
            discountAmount: calc.discountAmount,
            totalAmount: calc.totalAmount,
            customerName: sessionContext?.customerName || "Customer",
            customerEmail: sessionContext?.customerEmail || "customer@example.com"
          },
          productCards: [matchedProduct]
        };
      } else {
        return {
          text: "I'd be glad to help you place an order! Which product would you like to purchase? You can choose from our laptops, phones, tablets, headphones, and accessories.",
          intent,
          productCards: products.filter(p => p.Stock_Quantity > 0).slice(0, 6)
        };
      }
    }

    // ==========================================
    // INTENT: INVENTORY COUNT / TOTAL PRODUCTS QUERY
    // e.g., "how many products do you have?", "how many items", "show all products"
    // ==========================================
    const isTotalCountQuery = (
      (rawQuery.includes("how many") || rawQuery.includes("number of") || rawQuery.includes("total")) &&
      (rawQuery.includes("product") || rawQuery.includes("item") || rawQuery.includes("catalog") || rawQuery.includes("inventory"))
    ) || rawQuery.includes("what products do you have") || rawQuery.includes("show me all products") || rawQuery.includes("list all products");

    if (isTotalCountQuery) {
      intent = "PRODUCT_INQUIRY";
      const totalProducts = products.length;
      const inStockProducts = products.filter(p => p.Stock_Quantity > 0);
      const totalUnits = products.reduce((sum, p) => sum + p.Stock_Quantity, 0);

      // Group counts by category
      const catCounts: Record<string, { models: number; units: number }> = {};
      products.forEach(p => {
        if (!catCounts[p.Category]) {
          catCounts[p.Category] = { models: 0, units: 0 };
        }
        catCounts[p.Category].models += 1;
        catCounts[p.Category].units += p.Stock_Quantity;
      });

      const formatCatPlural = (cat: string) => {
        if (cat === "Mouse") return "Mice";
        if (cat === "Headphones") return "Headphones";
        return `${cat}s`;
      };

      const catSummary = Object.entries(catCounts)
        .map(([cat, data]) => `• **${formatCatPlural(cat)}**: ${data.models} models (${data.units} units in stock)`)
        .join("\n");

      return {
        text: `TechMart currently carries **${totalProducts} distinct products** across ${Object.keys(catCounts).length} categories, with a total of **${totalUnits} units in real-time stock** (${inStockProducts.length} in stock, ${totalProducts - inStockProducts.length} out of stock).\n\n**Real-Time Category Breakdown:**\n${catSummary}\n\nWhich category or device would you like to explore?`,
        intent,
        productCards: products.slice(0, 6)
      };
    }

    // ==========================================
    // INTENT: CATEGORY QUERY / "HOW MANY [CATEGORY]"
    // e.g., "how many laptop are available in you shop?", "how many phones"
    // ==========================================
    const matchedCategory = this.findCategoryMatch(rawQuery);
    if (matchedCategory) {
      const catProducts = products.filter(p => p.Category.toLowerCase() === matchedCategory.toLowerCase());
      const inStockCat = catProducts.filter(p => p.Stock_Quantity > 0);
      const totalUnits = catProducts.reduce((sum, p) => sum + p.Stock_Quantity, 0);

      const isAskingHowMany = rawQuery.includes("how many") || rawQuery.includes("number of") || rawQuery.includes("count") || rawQuery.includes("available");

      const itemsList = catProducts.map(p => {
        const stockStr = p.Stock_Quantity > 0 ? `${p.Stock_Quantity} in stock` : "Out of stock";
        const discStr = p.Discount && p.Discount !== "0%" ? ` (Save ${p.Discount})` : "";
        return `• **${p.Product_Name}**: $${p.Unit_Price.toFixed(2)}${discStr} — *${stockStr}*`;
      }).join("\n");

      if (isAskingHowMany) {
        return {
          text: `We currently have **${totalUnits} ${matchedCategory.toLowerCase()}(s) available** across **${inStockCat.length} in-stock model(s)** in our live inventory (plus ${catProducts.length - inStockCat.length} out of stock):\n\n${itemsList}\n\nWould you like more details or assistance purchasing one of these?`,
          intent: "PRODUCT_INQUIRY",
          productCards: catProducts
        };
      } else {
        return {
          text: `Here are our verified **${matchedCategory}s** available in real time:\n\n${itemsList}\n\nWhich model would you like to know more about?`,
          intent: "PRODUCT_INQUIRY",
          productCards: catProducts
        };
      }
    }

    // ==========================================
    // INTENT: SPECIFIC PRODUCT INQUIRY / PRICE CHECK / STOCK CHECK
    // ==========================================
    const singleProduct = this.findBestProductMatch(rawQuery, products);

    if (singleProduct) {
      const isPriceQuery = rawQuery.includes("price") || rawQuery.includes("cost") || rawQuery.includes("how much") || rawQuery.includes("discount") || rawQuery.includes("promotion");
      const isStockQuery = rawQuery.includes("stock") || rawQuery.includes("how many") || rawQuery.includes("available") || rawQuery.includes("left");

      intent = isPriceQuery ? "PRICE_DISCOUNT" : "PRODUCT_INQUIRY";

      const stockStatus = singleProduct.Stock_Quantity > 0 
        ? `In stock (**${singleProduct.Stock_Quantity} unit(s)** available)` 
        : "**Currently out of stock**";
      const discountInfo = singleProduct.Discount !== "0%" 
        ? `\n• **Active Promotion:** ${singleProduct.Promotion} (**Save ${singleProduct.Discount}**)` 
        : "";

      return {
        text: `Here is the real-time information for **${singleProduct.Product_Name}**:\n\n• **Unit Price:** **$${singleProduct.Unit_Price.toFixed(2)}**${discountInfo}\n• **Inventory Status:** ${stockStatus}\n• **Category:** ${singleProduct.Category}\n• **Specifications:** ${singleProduct.Description}\n\nWould you like to place an order for this item?`,
        intent,
        productCards: [singleProduct]
      };
    }

    // ==========================================
    // INTENT: CHEAPEST / MOST EXPENSIVE SUPERLATIVES
    // ==========================================
    if (rawQuery.includes("cheapest") || rawQuery.includes("lowest price") || rawQuery.includes("most affordable")) {
      const sorted = [...products].filter(p => p.Stock_Quantity > 0).sort((a, b) => a.Unit_Price - b.Unit_Price);
      if (sorted.length > 0) {
        const top = sorted[0];
        return {
          text: `Our most affordable in-stock product is **${top.Product_Name}** priced at **$${top.Unit_Price.toFixed(2)}** (${top.Stock_Quantity} in stock).\n\n• **Category:** ${top.Category}\n• **Description:** ${top.Description}`,
          intent: "PRICE_DISCOUNT",
          productCards: [top]
        };
      }
    }

    // ==========================================
    // INTENT: POLICY OR GEMINI LLM REASONING
    // ==========================================
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: SYSTEM_PROMPT
        });

        const prompt = `${geminiContextPrompt}\n\nRespond directly in concise, natural, professional English following Alpha's guidelines.`;
        console.log(`[Gemini API] Dispatching live context to Gemini 1.5 Flash...`);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return {
          text: text.trim(),
          intent: rawQuery.includes("policy") || rawQuery.includes("warranty") || rawQuery.includes("shipping") ? "POLICY_QUESTION" : "GENERAL",
          policyCitation: topCitation
        };
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local reasoning:", err);
      }
    }

    // Grounded policy answer
    if (policyResults.length > 0 && policyResults[0].score > 0.2) {
      const chunk = policyResults[0].chunk;
      return {
        text: `Based on TechMart's **${chunk.section}**:\n\n${chunk.content}\n\nIf you have questions regarding a specific order, feel free to provide your Order ID!`,
        intent: "POLICY_QUESTION",
        policyCitation: chunk.section
      };
    }

    // Default friendly assistant response
    return {
      text: "Hello! I'm **Alpha**, TechMart's AI customer-support assistant. I can help you check real-time stock & prices, explore products, track existing orders, place new orders, or evaluate returns and refunds. How can I assist you today?",
      intent: "GENERAL",
      productCards: products.filter(p => p.Stock_Quantity > 0).slice(0, 4)
    };
  }

  /**
   * Helper: Match category from user query
   */
  private static findCategoryMatch(query: string): string | null {
    const words = query.split(/[\s,?.!]+/);
    for (const word of words) {
      if (CATEGORY_MAP[word]) {
        return CATEGORY_MAP[word];
      }
    }
    // Also check compound terms
    if (query.includes("mobile phone") || query.includes("smart phone") || query.includes("cell phone")) {
      return "Mobile Phone";
    }
    return null;
  }

  /**
   * Helper: Smart product match against inventory
   */
  private static findBestProductMatch(query: string, products: Product[]): Product | null {
    const q = query.toLowerCase();

    // 1. Direct Product ID match (e.g. "PROD-001")
    const idMatch = products.find(p => q.includes(p.Product_ID.toLowerCase()));
    if (idMatch) return idMatch;

    // 2. Exact full name match
    const fullNameMatch = products.find(p => q.includes(p.Product_Name.toLowerCase()));
    if (fullNameMatch) return fullNameMatch;

    // 3. Significant distinctive keywords (>= 3 chars, excluding generic words)
    const STOP_WORDS = new Set(["the", "and", "for", "with", "buy", "get", "want", "order", "price", "how", "much", "many", "what", "does", "have", "you", "shop", "store", "your", "item", "unit", "this", "that", "pro", "max", "air"]);
    
    let bestProduct: Product | null = null;
    let highestScore = 0;

    for (const p of products) {
      const pNameLower = p.Product_Name.toLowerCase();
      const parts = pNameLower.split(/[\s-]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
      
      let matches = 0;
      for (const part of parts) {
        if (q.includes(part)) {
          matches++;
        }
      }

      if (matches > highestScore && matches >= 1) {
        highestScore = matches;
        bestProduct = p;
      }
    }

    return highestScore >= 1 ? bestProduct : null;
  }

  /**
   * Helper: Safely parse explicit quantities without mistaking product model digits
   * (e.g., Pixel 8, S24, XPS 15) for quantity
   */
  private static parseExplicitQuantity(message: string): number {
    // Check phrases like "buy 2 units", "order 3 phones", "2 pieces", "quantity of 4"
    const explicitMatch = message.match(
      /(?:order|buy|get|purchase|want)\s+(\d{1,2})\s*(?:units?|pieces?|items?|phones?|laptops?|tablets?|headphones?|speakers?|keyboards?|mice|s\b)|\b(\d{1,2})\s+(?:units?|pieces?|items?|laptops?|phones?|tablets?|headphones?|speakers?|keyboards?|mice)\b|\bquantity\s*(?:of|:)?\s*(\d{1,2})\b/i
    );

    if (explicitMatch) {
      const val = parseInt(explicitMatch[1] || explicitMatch[2] || explicitMatch[3], 10);
      if (val >= 1 && val <= 50) return val;
    }

    return 1;
  }
}
