import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details from frontend
  // 2. Validation - not empty
  // 3. Check if user already exists: username, email
  // 4. Check for images, check for avatar
  // 5. Upload them to cloudinary, avatar
  // 6. Create user Object for creating entry in debugger
  // 7.Remove password and refresh token from response
  // 8. Check for user Connection
  // 9. Return the response

  const { fullName, email, username, password } = req.body;
  console.log(fullName, email);
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }
  const existedUser = User.findOne({
    //to check if user already exists
    $or: [{ username }, { email }], // either email or username
  });
  if (existedUser) {
    throw new ApiError(409, "Username or Email already exists");
  }

  console.log(req.body);
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong: Failed to createuser");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});
export { registerUser };
