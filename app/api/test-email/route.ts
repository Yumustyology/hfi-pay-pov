import { testSendEmail } from "@/lib/email/brevo";
import { success, failure } from "@/lib/response";

export async function GET() {
  const result = await testSendEmail("yumustyology@gmail.com");
  if (result.success) {
    return success({ message: "Test email successfully sent to yumustyology@gmail.com" });
  } else {
    return failure(result.error ?? "Failed to send test email", 500);
  }
}
