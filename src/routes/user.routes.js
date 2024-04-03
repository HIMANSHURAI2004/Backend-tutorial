import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router =Router();


router.route("/register").post(registerUser)

//http://localhost/api/v1/users/register
export default router