import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation - not empty
    //check if user already exists:username,email
    //check for images ,check for avatar
    //upload them to clodinary
    //create user object -create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response 

    const { fullName,email,username,password } = req.body
    // console.log(req.body);
    // console.log("email: ",email);
    // console.log("password: ",password);
    if(
        [fullName,email,username,password].some((field) =>
        field?.trim()==="")
    )
    {
        throw new ApiError(400,"All Fields are required")
    }

    const existedUser =await User.findOne({
        $or:[{email},{username}]
    })
    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists")
    }

    // console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path
    // console.log(avatarLocalPath)
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
    

    let coverImageLocalPath;
    //checking coverimage with if else condition
    if(req.files && Array.isArray(req.files.coverImage) 
        && req.files.coverImage.length>0)
    {
        coverImageLocalPath=req.files?.coverImage[0]?.path
    }

    
    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) 



    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        username:username.toLowerCase(),
        email,
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        password,

    })
    // console.log(user);

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})

export { registerUser }