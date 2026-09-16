const Resource = require("../models/Resource");
const User = require("../models/user");
const { sendEmail } = require("../config/email");
const {
  resourceApprovedEmail,
  resourceRejectedEmail,
  newResourceSubmissionEmail,
} = require("../utils/emailTemplates");
const {
  deleteFileFromSupabase,
  uploadResourceFile,
} = require("../config/supabaseConfig");
const { sendServerError } = require("../utils/httpError");

const sendEmailSafely = async (options) => {
  try {
    await sendEmail(options);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Email delivery failed: ${error.message}`);
    }
    return false;
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Upload new resource (verified users only)
const uploadResource = async (req, res) => {
  let uploadedFile;
  let resource;

  try {
    const {
      courseName,
      title,
      description,
      resourceType,
      department,
      semester,
      section,
      batch,
      year,
      pages,
      thumbnailUrl,
    } = req.body;

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Only verified users can upload resources. Please verify your email first.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A resource file is required",
      });
    }

    uploadedFile = await uploadResourceFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const isAdmin = req.user.role === "admin";
    const status = isAdmin ? "approved" : "pending";

    resource = await Resource.create({
      courseName,
      title,
      description,
      resourceType,
      department,
      semester,
      section,
      batch,
      year,
      fileName: req.file.originalname,
      fileUrl: uploadedFile.fileUrl,
      storagePath: uploadedFile.storagePath,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: req.file.mimetype,
      pages: pages || 0,
      thumbnailUrl,
      uploadedBy: req.user._id,
      uploaderName: req.user.fullName,
      uploaderEmail: req.user.email,
      status: status,
      ...(isAdmin && {
        reviewedBy: req.user._id,
        reviewedAt: Date.now(),
      }),
    });

    let notificationsSent = 0;
    if (!isAdmin) {
      const admins = await User.find({ role: "admin" }).select("fullName email");
      for (const admin of admins) {
        const sent = await sendEmailSafely({
          email: admin.email,
          subject: "New Resource Submitted for Approval - Unibro",
          html: newResourceSubmissionEmail(
            admin.fullName,
            req.user.fullName,
            title,
            courseName,
            resourceType,
            department,
            semester
          ),
        });
        if (sent) notificationsSent += 1;
      }
    }

    const successMessage = isAdmin
      ? "Resource uploaded and automatically approved!"
      : "Resource uploaded successfully! It will be available after admin approval.";

    res.status(201).json({
      success: true,
      message: successMessage,
      notificationsSent,
      resource,
    });
  } catch (error) {
    if (uploadedFile?.storagePath && !resource) {
      await deleteFileFromSupabase(uploadedFile.storagePath);
    }
    sendServerError(res, "Failed to upload resource", error);
  }
};

// Get approved resources with filters
const getResources = async (req, res) => {
  try {
    const { search, year, resourceType, section, batch, department, semester } =
      req.query;

    let query = { status: "approved" };

    if (department && department !== "All") {
      query.department = department;
    }
    if (semester && semester !== "All") {
      query.semester = semester;
    }
    if (resourceType && resourceType !== "All") {
      query.resourceType = resourceType;
    }
    if (year && year !== "All") {
      query.year = parseInt(year);
    }
    if (section) {
      query.section = section;
    }
    if (batch) {
      query.batch = batch;
    }

    if (search) {
      const safeSearch = escapeRegExp(search);
      query.$or = [
        { courseName: { $regex: safeSearch, $options: "i" } },
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { department: { $regex: safeSearch, $options: "i" } },
        { semester: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const resources = await Resource.find(query)
      .select("-uploaderEmail")
      .populate("uploadedBy", "fullName")
      .sort({ createdAt: -1 });

    const groupedByYear = resources.reduce((acc, resource) => {
      const year = resource.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(resource);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: resources.length,
      resources: groupedByYear,
    });
  } catch (error) {
    sendServerError(res, "Failed to fetch resources", error);
  }
};

// Get user's own resources
const getMyResources = async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user._id }).sort({
      createdAt: -1,
    });

    const groupedByStatus = {
      pending: resources.filter((r) => r.status === "pending"),
      approved: resources.filter((r) => r.status === "approved"),
      rejected: resources.filter((r) => r.status === "rejected"),
    };

    res.status(200).json({
      success: true,
      count: resources.length,
      resources: groupedByStatus,
    });
  } catch (error) {
    sendServerError(res, "Failed to fetch your resources", error);
  }
};

// Delete resource and associated file
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (
      resource.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this resource",
      });
    }

    if (resource.storagePath || resource.fileUrl) {
      const storageResult = await deleteFileFromSupabase(
        resource.storagePath || resource.fileUrl
      );
      if (!storageResult.success) {
        return res.status(502).json({
          success: false,
          message: "File storage cleanup failed; the resource was not deleted",
        });
      }
    }

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: "Resource and file deleted successfully",
    });
  } catch (error) {
    sendServerError(res, "Failed to delete resource", error);
  }
};

// Get pending resources (admin only)
const getPendingResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: "pending" })
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    sendServerError(res, "Failed to fetch pending resources", error);
  }
};

// Approve resource (admin only)
const approveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Resource has already been reviewed",
      });
    }

    resource.status = "approved";
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = Date.now();
    await resource.save();

    const notificationSent = await sendEmailSafely({
      email: resource.uploaderEmail,
      subject: "Your Resource Has Been Approved! 🎉 - Unibro",
      html: resourceApprovedEmail(
        resource.uploaderName,
        resource.title,
        resource.courseName
      ),
    });

    res.status(200).json({
      success: true,
      message: "Resource approved successfully",
      notificationSent,
      resource,
    });
  } catch (error) {
    sendServerError(res, "Failed to approve resource", error);
  }
};

// Reject resource and delete file (admin only)
const rejectResource = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Resource has already been reviewed",
      });
    }

    resource.status = "rejected";
    resource.rejectionReason = reason;
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = Date.now();
    await resource.save();

    if (resource.storagePath || resource.fileUrl) {
      const storageResult = await deleteFileFromSupabase(
        resource.storagePath || resource.fileUrl
      );
      if (!storageResult.success) {
        resource.status = "pending";
        resource.rejectionReason = null;
        resource.reviewedBy = null;
        resource.reviewedAt = null;
        await resource.save();
        return res.status(502).json({
          success: false,
          message: "File storage cleanup failed; the resource was not rejected",
        });
      }
    }

    const notificationSent = await sendEmailSafely({
      email: resource.uploaderEmail,
      subject: "Resource Submission Update - Unibro",
      html: resourceRejectedEmail(
        resource.uploaderName,
        resource.title,
        resource.courseName,
        reason
      ),
    });

    res.status(200).json({
      success: true,
      message: "Resource rejected and file deleted",
      notificationSent,
      resource,
    });
  } catch (error) {
    sendServerError(res, "Failed to reject resource", error);
  }
};

// Increment download count
const incrementDownload = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    await resource.incrementDownload();

    res.status(200).json({
      success: true,
      message: "Download count updated",
    });
  } catch (error) {
    sendServerError(res, "Failed to update download count", error);
  }
};

// Increment view count
const incrementView = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    await resource.incrementView();

    res.status(200).json({
      success: true,
      message: "View count updated",
    });
  } catch (error) {
    sendServerError(res, "Failed to update view count", error);
  }
};

// Get all resources for admin dashboard
const getAllResourcesAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const resources = await Resource.find(query)
      .populate("uploadedBy", "fullName email")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 });

    const stats = {
      total: resources.length,
      pending: resources.filter((r) => r.status === "pending").length,
      approved: resources.filter((r) => r.status === "approved").length,
      rejected: resources.filter((r) => r.status === "rejected").length,
    };

    res.status(200).json({
      success: true,
      stats,
      resources,
    });
  } catch (error) {
    sendServerError(res, "Failed to fetch resources", error);
  }
};

// Get resource counts by department and semester
const getResourceCounts = async (req, res) => {
  try {
    const { department, semester } = req.query;

    if (!department || !semester) {
      return res.status(400).json({
        success: false,
        message: "Department and semester are required",
      });
    }

    const counts = await Resource.aggregate([
      {
        $match: {
          department: department,
          semester: semester,
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$resourceType",
          count: { $sum: 1 },
        },
      },
    ]);

    const countObject = {};
    counts.forEach((item) => {
      countObject[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      counts: countObject,
    });
  } catch (error) {
    sendServerError(res, "Error fetching resource counts", error);
  }
};

module.exports = {
  uploadResource,
  getResources,
  getMyResources,
  deleteResource,
  getPendingResources,
  approveResource,
  rejectResource,
  incrementDownload,
  incrementView,
  getAllResourcesAdmin,
  getResourceCounts,
};
