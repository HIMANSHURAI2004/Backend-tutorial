import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})


        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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


const loginUser= asyncHandler(async (req,res) =>{
    //req body -> data
    //username or email
    //find the user 
    //password check
    //access and refresh token
    //send cookie

    const {email,username,password}=req.body

    if(!(username || email))
    {
        throw ApiError(400,"username or email is required")
    }

    const user =await User.findOne({
        $or : [ {email} , {username} ]
    })

    if(!user)
    {
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid)
    {
        throw ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)


    //we are sending data to user and we don't want to send password and refreshToken to the user
    const loggedInUser=await User.findById(user._id).select(
        " -password -refreshToken"
    )

    //cookie jo hoti h vo koi bhi modify kr sakta h frontend pe
    //pr jab options dete h toh vo bs server se modifiable hoti h
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                //accesstoken or refreshtoken hum isliye bhej rhe h kyoki agr user cookies save krna chah rha ho
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged in Successfully"
            )
    )

})

//logout krne ke liye hume cookies clear krni pdegi or refreshToken ko reset krna pdega
const logoutUser=asyncHandler(async(req,res) =>{
    //user ko logout krne ke liye id chahiye pr id ni h hmare pass
    //id ko paane ke liye hum middleware lgayenge jo req me user ko daal dega
    //phir hum req se user leke uski id access kr sakte h
    await User.findByIdAndUpdate(
        req.user._id,
        {
            //kya kya update krna h vo hum set me btate h
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true
        }
    )
    
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User Logged Out")
    )

})

const refreshAccessToken = asyncHandler(async() =>{
    const incomingRefreshToken=ref.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
    
        if(!user)
        {
            throw new ApiError(401,"Invalid refresh Token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken)
        {
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
        
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"       
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message|| "Invalid refresh token")
    }

    
})

const changeCurrentPassword = asyncHandler(async (req,res) =>{
    const {oldPassword,newPassword}= req.body;
    // const {oldPassword,newPassword,confirmPassword}= req.body;
    // if(!(newPassword===confirmPassword))
    // {
    //     throw new ApiError(400,"Password and confirm password must be same")
    // }

    const user=await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Invalid user Password")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password change successfully"))

})

const getCurrentUser = asyncHandler(async (req,res) =>{
    return res
    .status(200)
    .json(
        new ApiResponse(200,req.user,"Current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req,res) =>{ 
    const {fullName,email} = req.body

    if(!fullName || !email)
    {
        throw new ApiError(400,"All fields are required")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {
            new:true
        }

    ).select(
        "-password"
    )
    
    
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Account details updated successfully")
    )
})


const updateUserAvatar=asyncHandler(async(req,res) =>{
    const avatarLocalPath = req.file?.path
    // console.log(avatarLocalPath)
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                    avatar:avatar.url
                 }
        },
        {
            new:true
        }
    ).select(
        "-password"
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated successfully")
    )
})

const updateUserCoverImage=asyncHandler(async(req,res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading coverImage")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                    coverImage:coverImage.url
                 }
        },
        {
            new:true
        }
    ).select(
        "-password"
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"CoverImage updated successfully")
    )

})

const getUserChannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim())
    {
        new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            } 
        },
        {
            $lookup:{
                from:"subscriptions",//yha pe plural hone ke baad ka likhenge
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",//yha pe plural hone ke baad ka likhenge
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"//dollar use krenge kyoki subscribers ek field h
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscriber:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$subscribers.subscriber"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullName:1,
                email:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscriber:1,
                avatar:1,
                coverImage:1
            }
        }
    ])
    
    // console.log(channel)

    if(!channel?.length)
    {
        throw new ApiError(404,"channel does not exist")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})


const getWatchHistory= asyncHandler(async(req,res) =>{
    const user= await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                //owner bhi ek user hi h toh owner ka data bhi mile uske liye hum nested pipeline lagayenge
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    // req.user._id isse hume string milti h jisse mongoose convert krta h mongoDB ki id me

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"User Watch history fetched successfully")
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,

 }