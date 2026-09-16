const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const path = require("path");

let supabase;
const getBucket = () => process.env.SUPABASE_BUCKET || "unibro-files";

const getSupabase = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase Storage is not configured");
  }

  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }

  return supabase;
};

const uploadBuffer = async (folder, fileBuffer, fileName, contentType) => {
  const extension = path.extname(fileName).toLowerCase();
  const filePath = `${folder}/${crypto.randomUUID()}${extension}`;
  const client = getSupabase();

  const { error } = await client.storage
    .from(getBucket())
    .upload(filePath, fileBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (error) throw error;

  const { data } = client.storage.from(getBucket()).getPublicUrl(filePath);
  return { fileUrl: data.publicUrl, storagePath: filePath };
};

const uploadResourceFile = (fileBuffer, fileName, contentType) =>
  uploadBuffer("resources", fileBuffer, fileName, contentType);

/**
 * Delete file from Supabase Storage
 */
const deleteFileFromSupabase = async (fileUrl) => {
  try {
    if (!fileUrl) {
      return { success: false, error: "No file URL provided" };
    }

    // Extract storage path from URL
    let filePath = fileUrl;
    if (fileUrl.includes("http")) {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split(`/${getBucket()}/`);
      if (pathParts.length > 1) {
        filePath = pathParts[1];
      }
    }

    const { error } = await getSupabase()
      .storage.from(getBucket())
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to delete file",
    };
  }
};

/**
 * Delete staff image from Supabase Storage
 */
const deleteStaffImage = async (storagePath) => {
  try {
    if (!storagePath) {
      return { success: false, error: "No storage path provided" };
    }

    const { error } = await getSupabase()
      .storage.from(getBucket())
      .remove([storagePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to delete staff image",
    };
  }
};

/**
 * Upload staff image to Supabase Storage
 */
const uploadStaffImage = async (fileBuffer, fileName, contentType) => {
  try {
    const result = await uploadBuffer(
      "staff-profiles",
      fileBuffer,
      fileName,
      contentType,
    );

    return {
      success: true,
      imageUrl: result.fileUrl,
      storagePath: result.storagePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to upload staff image",
    };
  }
};

/**
 * Extract storage path from staff image URL
 */
const extractStaffImagePath = (imageUrl) => {
  try {
    if (!imageUrl) return null;

    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/staff-profiles/");

    if (pathParts.length > 1) {
      return `staff-profiles/${pathParts[1]}`;
    }

    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  getSupabase,
  uploadResourceFile,
  deleteFileFromSupabase,
  deleteStaffImage,
  uploadStaffImage,
  extractStaffImagePath,
};
