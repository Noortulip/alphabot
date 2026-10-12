import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GeminiAgent } from "@/lib/gemini";
import { GoogleSheetsService } from "@/lib/googleSheets";

const chatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().default("session-guest"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string()
  })).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { message, sessionId, customerEmail, customerName, history } = parsed.data;

    // Process message with Alpha agent
    const agentResponse = await GeminiAgent.processMessage(
      message,
      history || [],
      { customerEmail, customerName }
    );

    // Record interaction log
    const interactionId = `LOG-${Math.floor(10000 + Math.random() * 90000)}`;
    await GoogleSheetsService.appendLog({
      Interaction_ID: interactionId,
      Timestamp: new Date().toISOString(),
      Session_ID: sessionId,
      Customer_ID: customerEmail || "Guest",
      Intent: agentResponse.intent,
      Customer_Query: message,
      Retrieved_Data_Sources: agentResponse.policyCitation ? `Policy: ${agentResponse.policyCitation}` : "TechMart Inventory",
      AI_Response: agentResponse.text,
      Action_Status: "SUCCESS"
    });

    return NextResponse.json({
      success: true,
      data: agentResponse
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}
