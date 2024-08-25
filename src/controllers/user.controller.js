import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteOldImage } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
      // $set: { refreshToken: undefined }, this is not working
      // $set: { refreshToken: null }, //this works but not the best approach
      $unset: { refreshToken: 1 }, //this removes the field from document
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(404, "Invalid Refresh Token");

    if (incomingRefreshToken != user?.refreshToken)
      throw new ApiError(401, "Refresh Token is Expired or Used");

    //*to send again we need to generate it again right
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refresh"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(401, "Invalid current password");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All Fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated successfully"));
});

const updateUserAvatarImage = asyncHandler(async (req, res) => {
  const localAvatarPath = req.file?.path;
  if (!localAvatarPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(localAvatarPath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar on Cloudinary");
  }
  console.log(req.user.avatar, "Public id check kar");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  deleteOldImage(req.user?.avatar); //after user updates we have to delete the old image

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverPath = req.file?.path;
  if (!localCoverPath) {
    throw new ApiError(400, "Cover Image file is required");
  }

  const coverImage = await uploadOnCloudinary(localCoverPath);
  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading cover image");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  deleteOldImage(req.user?.coverImage);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated successfully"));
});

//Aggregation Pipeline 1
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) throw new ApiError(400, "Username is missing");

  const channel = await User.aggregate([
    //we can even do User.find({username}) but use match here
    {
      //first pipeline to match users
      $match: { username: username?.toLowerCase() }, //finds a particular document form all documents
    },
    {
      // how many subscribers he has through channel
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        //how many he has subscribred through subscriber
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        //add extra fields which we need
        subscribersCount: {
          $size: "$subscribers", // size will give size of the finalField
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //in checks if id is present or into in subscriber(in checks in obj and array also For now we are checking in obj subscribers)
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        // project fields which we want to send back or fields which we want to show
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel Does Not Exist");
  }
  console.log(channel); // to check data type of aggreafate pipeline returns
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        //_id: req.user?._id, //yaha pe mongoose kaam nahi karta aggregation pipeline ka jitna code hai wo directly jata  hai so we need to convert to mongoose object ID.
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          //for getting data of owner from users
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            //for frontend to send data properly
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully."
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatarImage,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
