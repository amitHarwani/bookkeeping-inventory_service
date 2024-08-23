import { NextFunction, Request, Response, Router } from "express";
import {
    addItemValidator,
    getAllItemsValidator,
    getItemValidator,
    updateItemValidator,
} from "../validators/item.validators";
import { validateInput } from "../validators";
import {
    addItem,
    getAllItems,
    getItem,
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

router.get(
    "/get-item",
    getItemValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(7, Number(req.query?.companyId))(req, res, next);
    },
    getItem
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
