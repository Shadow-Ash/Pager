import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getSessionWallet } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function hasValidImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (type === "image/avif") return String.fromCharCode(...bytes.slice(4, 12)).includes("ftypavif") || String.fromCharCode(...bytes.slice(4, 12)).includes("ftypavis");
  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!getSessionWallet(req)) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, message: "Only JPEG, PNG, WebP, and AVIF images are allowed" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "Image must be smaller than 5 MB" }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidImageSignature(bytes, file.type)) {
      return NextResponse.json({ success: false, message: "File content does not match an allowed image format" }, { status: 415 });
    }

    const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "pager",
          resource_type: "image",
          quality: "auto",
          fetch_format: "auto",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        },
        (error, result) => {
          if (error) reject(error);
          else if (!result?.secure_url) reject(new Error("Cloudinary returned no secure URL"));
          else resolve({ secure_url: result.secure_url });
        }
      ).end(Buffer.from(bytes));
    });

    return NextResponse.json({ success: true, url: upload.secure_url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
