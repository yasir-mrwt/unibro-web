const Staff = require("../models/Staff");
const {
  deleteStaffImage,
  extractStaffImagePath,
  uploadStaffImage,
} = require("../config/supabaseConfig");
const { DEPARTMENTS } = require("../constants/departments");
const { sendServerError } = require("../utils/httpError");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildStaffData = (body) => ({
  name: body.name,
  email: body.email,
  department: body.department,
  courses: parseArrayField(body.courses),
  qualification: body.qualification,
  office: body.office,
  counsellingHours: body.counsellingHours,
  phoneNumber: body.phoneNumber,
  bio: body.bio,
  specialization: parseArrayField(body.specialization),
  yearsOfExperience:
    body.yearsOfExperience === "" || body.yearsOfExperience === undefined
      ? undefined
      : Number(body.yearsOfExperience),
});

// Get all staff with pagination and search
const getAllStaff = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      search = "",
      department = "",
      sortBy = "name",
    } = req.query;

    let query = {};

    if (search) {
      const safeSearch = escapeRegExp(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { department: { $regex: safeSearch, $options: "i" } },
        { courses: { $regex: safeSearch, $options: "i" } },
        { qualification: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (department) {
      query.department = department;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Staff.countDocuments(query);

    const staff = await Staff.find(query)
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(skip);

    res.status(200).json({
      success: true,
      data: staff,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalStaff: total,
        hasMore: skip + staff.length < total,
      },
    });
  } catch (error) {
    sendServerError(res, "Error fetching staff", error);
  }
};

// Get single staff member
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    sendServerError(res, "Error fetching staff member", error);
  }
};

// Create new staff member
const createStaff = async (req, res) => {
  let uploadedImage;

  try {
    const staffData = buildStaffData(req.body);

    const existingStaff = await Staff.findOne({ email: staffData.email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    if (req.file) {
      uploadedImage = await uploadStaffImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      if (!uploadedImage.success) throw new Error(uploadedImage.error);
      staffData.image = uploadedImage.imageUrl;
    }

    const staff = await Staff.create(staffData);

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    if (uploadedImage?.storagePath) {
      await deleteStaffImage(uploadedImage.storagePath);
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    sendServerError(res, "Error creating staff member", error);
  }
};

// Update staff member
const updateStaff = async (req, res) => {
  let uploadedImage;

  try {
    const existingStaff = await Staff.findById(req.params.id);
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const staffData = buildStaffData(req.body);
    if (req.file) {
      uploadedImage = await uploadStaffImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      if (!uploadedImage.success) throw new Error(uploadedImage.error);
      staffData.image = uploadedImage.imageUrl;
    }

    const staff = await Staff.findByIdAndUpdate(req.params.id, staffData, {
      new: true,
      runValidators: true,
    });

    if (uploadedImage?.storagePath && existingStaff.image) {
      const previousPath = extractStaffImagePath(existingStaff.image);
      if (previousPath) await deleteStaffImage(previousPath);
    }

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: staff,
    });
  } catch (error) {
    if (uploadedImage?.storagePath) {
      await deleteStaffImage(uploadedImage.storagePath);
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    sendServerError(res, "Error updating staff member", error);
  }
};

// Delete staff member permanently (hard delete)
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const imagePath = extractStaffImagePath(staff.image);
    if (imagePath) {
      const storageResult = await deleteStaffImage(imagePath);
      if (!storageResult.success) {
        return res.status(502).json({
          success: false,
          message: "Image cleanup failed; the staff member was not deleted",
        });
      }
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Staff member permanently deleted",
    });
  } catch (error) {
    sendServerError(res, "Failed to delete staff member", error);
  }
};

// Get all departments
const getDepartments = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: DEPARTMENTS,
    });
  } catch (error) {
    sendServerError(res, "Error fetching departments", error);
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDepartments,
};
