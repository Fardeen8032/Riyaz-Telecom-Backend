import express from "express";
import { getCategories } from "../Controller/Category/categoryController.js";

const router = express.Router();

router.get("/", getCategories);

export default router;