import express from "express";
import signup from "../controllers/signup.js";
import login from "../controllers/login.js";

const userAuth = express.Router();

userAuth.post("/auth/signup", signup); 
userAuth.post("/auth/login", login);  

export default userAuth;
