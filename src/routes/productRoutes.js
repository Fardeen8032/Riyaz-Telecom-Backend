import express from "express";
import {createProduct,getProducts} from "../Controller/Product/productController.js";

const router = express.Router();

router.post("/add-product", createProduct);
router.get("/get-products", getProducts);

export default router;