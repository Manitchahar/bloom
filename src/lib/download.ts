function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function downloadImage(imageUrl: string, name: string) {
  const fileName = `${safeFileName(name) || "bloom-image"}.png`;

  if (imageUrl.startsWith("data:")) {
    triggerDownload(imageUrl, fileName);
    return;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Image request failed.");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    triggerDownload(url, fileName);
    URL.revokeObjectURL(url);
  } catch {
    triggerDownload(imageUrl, fileName);
  }
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
