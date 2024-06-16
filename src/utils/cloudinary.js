import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLODINARY_API_KEY, 
  api_secret:process.env.CLODINARY_API_SECRET 
});


const uploadOnCloudinary=async function(localFilePath){
    try{
        if(!localFilePath) return null
        //upload the file in cloudinary
        const response=await cloudinary.uploader.upload(
            localFilePath,{
                resource_type:"auto"
            })
        //file uploaded successfully
        // console.log("file is uploaded on clodinary",response.url);
        fs.unlinkSync(localFilePath)
        return response;

    }
    catch(error){
        fs.unlinkSync(localFilePath)
        //remove the locally saved temporary file as the upload got failed
        return null;
    }
}


export {uploadOnCloudinary}