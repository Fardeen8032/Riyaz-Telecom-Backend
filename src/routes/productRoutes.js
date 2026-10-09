import express from "express";
import {createProduct,getProductById,getProducts, getRelatedProducts, updateProduct,deleteProduct} from "../Controller/Product/productController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/add-product",upload.array("images", 5), createProduct);
router.get("/get-products", getProducts);
router.get("/:id", getProductById);
router.get("/:id/related", getRelatedProducts);
router.patch("/:id",upload.array("images", 5),updateProduct);
router.delete("/:id", deleteProduct);

export default router;