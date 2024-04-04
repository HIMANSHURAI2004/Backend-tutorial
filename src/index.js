import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { mongo } from "mongoose";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})


connectDB()
.then(()=>{
    app.on('error',(error)=>{
        console.log("ERR: ",error);
        throw error;
    })

    app.listen(process.env.PORT,()=>{
        console.log(`Server is listening at PORT : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGODB CONNECTION FAILED !!!",err)
})








// import express from "express"
// const app=express()

// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERR: ",error);
//             throw error
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     }
//     catch(error){
//         console.error("ERROR",error)
//         throw err
//     }
// })()