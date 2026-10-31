import { handleOs } from "@/lib/os/handler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, { params }: Params) {
  return handleOs(req, (await params).path);
}
export async function POST(req: Request, { params }: Params) {
  return handleOs(req, (await params).path);
}
