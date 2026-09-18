const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../constants/departments");

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: DEPARTMENTS,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    courses: [
      {
        type: String,
        trim: true,
      },
    ],
    qualification: {
      type: String,
      required: [true, "Qualification is required"],
    },
    office: {
      type: String,
      required: [true, "Office location is required"],
    },
    counsellingHours: {
      type: String,
      required: [true, "Counselling hours are required"],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    specialization: [
      {
        type: String,
      },
    ],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "staffs",
  }
);

// Index for faster searches
staffSchema.index({ name: "text", department: "text", courses: "text" });

module.exports = mongoose.model("Staff", staffSchema);
