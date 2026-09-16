// Files are uploaded and deleted by the authenticated backend. These helpers
// only handle public download/preview URLs returned by the API.
export const getDownloadUrl = (fileUrl, fileName = "download") => {
  const url = new URL(fileUrl);
  url.searchParams.set("download", fileName);
  return url.toString();
};

export const downloadFile = async (fileUrl, fileName = "download.pdf") => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("File download failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to download file",
    };
  }
};

export const getPreviewUrl = (fileUrl) => fileUrl;
