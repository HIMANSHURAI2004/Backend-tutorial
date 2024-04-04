import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import  jwt  from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT=asyncHandler(async (req, _ ,next) =>{
    //tokens se hum verify kr rhe h user ke pass sahi token h ya ni

    try {
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token)
        {
            new ApiError(401,"Unauthorized request")
        }
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )
    
        if(!user)
        {
            
            throw ApiError(401,"Invalid Access Token")
        }
    
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }

    
})