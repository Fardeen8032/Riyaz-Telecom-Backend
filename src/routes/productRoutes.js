import express from "express";
import {createProduct,getProducts} from "../Controller/Product/productController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/add-product",upload.single("image"), createProduct);
router.get("/get-products", getProducts);

export default router;