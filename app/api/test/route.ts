import { connectDB } from "@/lib/mongodb";
import { success } from "@/lib/response";

export async function GET() {
  await connectDB();

  return success({
    message: "MongoDB Connected 🚀",
  });
}
