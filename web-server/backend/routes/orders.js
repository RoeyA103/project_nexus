import { Router } from "express";
import { createOrder, getOrders } from "../controllers/orders/orderController.js";

const router = Router();

router.post("/orders", createOrder);
router.get("/orders", getOrders);

export default router;
