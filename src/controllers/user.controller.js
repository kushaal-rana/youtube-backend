import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken; // added refresh token to user object
    await user.save({ validateBeforeSave: false }); //Here we don't have password with us or any other object just we added refresh token to user object and saved in mongoDB(validateBeforeSave=>ignores the required properties and saves)
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      `${error}: Something went wrong while generating refresh and access token`
    );
  }
};

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

  const { fullName, email, username, password } = req.body; //Step 1: Get user details from frontend
  // console.log(fullName, email);
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required"); // Step 2: Validation Check
  }
  //Step 3:
  const existedUser = await User.findOne({
    //find one is an database method hence whenever communicating with DB use await
    //to check if user already exists
    $or: [{ username }, { email }], // either email or username
  });

  if (existedUser) {
    throw new ApiError(409, "Username or Email already exists");
  }

  // console.log(req.body, "Body Here");
  // console.log("Files", req.files);
  //Step 4
  const avatarLocalPath = req.files?.avatar[0]?.path; // got the data now get the file data
  //req.files is added by multer automatically as we configured middleware
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath; //check for cover image also
  if (
    req.files &&
    Array.isArray(req.files.coverImage) && //agar array hai tho phir uski cover image ka length greater hai tho first value return karo
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  //Step 5: Upload on Cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //Step 6: Create user Object
  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", //checking is required as undefined?.url gives error
  });

  //Step 7: Remove password and refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //do not include password and refresh token while sending the response to user(See in postman we don't have these 2 fileds as response)
  );
  //Step 8: Check for user Connection
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong: Failed to createuser");
  }

  //Step 9: Return the response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // TODO: 1. Get the data from the (req body)
  // 2. check If it is username based or email based
  // 3. Validation Checks of empty
  // 4. Find the user if it exists if not there return
  // 5. If present then Password check
  // 6. Store the data in the DB
  // 7. Generate the Access Token and refresh token
  // 8. Generate the cookie with the refresh token
  // 9. Send the access token and cookie to the frontend
  // 10. Return the response

  const { username, email, password } = req.body; //either username or email

  if (!(username || email)) {
    throw new ApiError(400, "Username or Email is required");
  }

  const user = await User.findOne({
    //find the user based on the username or email
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // *current user's refresh token is empty as we have another refresh token which we got from the method, Hence we can upadte the user object or we can do DB call and get the details of another user.(with refresh token as we have saved)
  // user.refreshToken = refreshToken this will also work or below thing also works

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken" // ? before sending to user we dont want to send password & refresh tokens(refresh token dono why he removed as we are sending it in cookies may be?)
  );

  //Sending Cookies But with options so that it can't be modified in frontend
  const options = {
    //by default cookies can be modified by frontend
    httpOnly: true, //making it true will make cookies modifiable only by server
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true, //returned response has new value now (with refreshtoken undefined) from DB
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});
export { registerUser, loginUser, logoutUser };
