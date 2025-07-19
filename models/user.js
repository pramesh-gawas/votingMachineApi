const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
  },
  mobile: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  aadharCardNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enums: ["voter", "admin"],
    default: "voter",
  },
  isVoted: {
    type: Boolean,
    default: false,
  },
  photo: {
    type: String,
    default: "",
  },
});

userSchema.pre("save", async function (next) {
  const person = this;

  if (!person.isModified("password")) return next();
  //hash the password only if it has been modified (or is new)

  try {
    //hash password generate

    const salt = await bcrypt.genSalt(10);
    // hash password
    const hashedPassword = await bcrypt.hash(person.password, salt);

    //override the plain password with the hashed one
    person.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error) {
    throw error;
  }
};

userSchema.index(
  { role: 1 }, // Index on the 'role' field
  {
    unique: true, // the index unique
    // This filter applies the unique constraint ONLY when the role is 'admin'
    partialFilterExpression: { role: "admin" },
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
