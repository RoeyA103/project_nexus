import { Router } from "express";
import { getUsers } from "../controllers/admin/userController.js";

const router = Router();

router.get("/admin/users", getUsers);

export default router;
