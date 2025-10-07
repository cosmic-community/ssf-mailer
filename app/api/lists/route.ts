import { NextRequest, NextResponse } from "next/server";
import { createEmailList, getEmailLists } from "@/lib/cosmic";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const lists = await getEmailLists();
    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error("Error fetching email lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch email lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // Create the list
    const result = await createEmailList({
      name: body.name,
      description: body.description || "",
      list_type: body.list_type || "General",
      active: body.active !== false,
    });

    // Revalidate the lists and contacts pages
    revalidatePath("/contacts");
    revalidatePath("/campaigns");

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating email list:", error);
    return NextResponse.json(
      { error: "Failed to create email list" },
      { status: 500 }
    );
  }
}
