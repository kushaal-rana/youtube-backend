import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
//res is not used here so _
// here since we added cookieParser so we can use it with req and res
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); //just want the value not the token name not Bearer<space>)
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      //_id is already present at sign token(check user model)
      "-password -refreshToken"
    );
    if (!user) {
      // ! TODO: Discuss About frontend
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user; //finally now you have the user details with you
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
// this middle ware whenever user will click on logout we will have the req with us form that we can extract the access token once it is accessed we need to decode it using jwt after decoding
