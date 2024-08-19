import { Router } from "express";
import {
    addItemValidator,
    getAllItemsValidator,
    updateItemValidator,
} from "../validators/item.validators";
import { validateInput } from "../validators";
import {
    addItem,
    getAllItems,
    updateItem,
} from "../controllers/item.controllers";
import { checkAccess } from "../middlewares/auth.middleware";

const router = Router();

router.post(
    "/get-all-items",
    getAllItemsValidator(),
    validateInput,
    checkAccess(7),
    getAllItems
);

router.post(
    "/add-item",
    addItemValidator(),
    validateInput,
    checkAccess(8),
    addItem
);

router.put(
    "/update-item",
    updateItemValidator(),
    validateInput,
    checkAccess(8),
    updateItem
);
export default router;
