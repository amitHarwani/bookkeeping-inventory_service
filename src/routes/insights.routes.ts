import { Router } from "express";
import { checkAccess } from "../middlewares/auth.middleware";
import { validateInput } from "../validators";
import {
    getLowStockItemsValidator
} from "../validators/insights.validators";
import { getLowStockItems } from "../controllers/insights.controllers";

const router = Router();

router.post(
    "/get-low-stock-items",
    getLowStockItemsValidator(),
    validateInput,
    checkAccess(20),
    getLowStockItems
);

export default router;
