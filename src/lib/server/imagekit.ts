const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

function basicAuthHeader(secret: string) {
  const token = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${token}`;
}

export async function uploadToImageKit({ fileBuffer, fileName }: { fileBuffer: Buffer; fileName: string }) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY not configured");

  const form = new FormData();
  // ImageKit accepts base64 file as `file` param string "data:<mime>;base64,<base64>"
  const base64 = fileBuffer.toString("base64");
  form.append("file", `data:application/octet-stream;base64,${base64}`);
  form.append("fileName", fileName);

  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(privateKey),
    } as any,
    body: form as any,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ImageKit upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.url || data.filePath || data.thumbnail || data;
}
