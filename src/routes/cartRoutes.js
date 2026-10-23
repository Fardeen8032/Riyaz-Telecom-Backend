import { Router } from "express";
import {getCart,addToCart,updateCartItem,removeCartItem,clearCart} from "../Controller/Cart/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

// All cart operations require authentication.
router.use(authMiddleware);

router.get("/", getCart);
router.post("/items", addToCart);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

export default router;
