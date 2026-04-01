import { NextResponse } from "next/server";
import { getProducts } from "@/lib/queries";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([]);
  }
}
