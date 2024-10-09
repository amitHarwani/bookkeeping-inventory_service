import { Router, Request, Response, NextFunction } from "express";
import {
    addTransferValidator,
    getAllTransfersValidator,
    getTransferValidator,
} from "../validators/transfers.validators";
import { checkAccess, isLoggedIn } from "../middlewares/auth.middleware";
import {
    addTransfer,
    getAllTransfers,
    getTransfer,
} from "../controllers/transfers.controllers";
import { validateInput } from "../validators";

const router = Router();

router.post(
    "/get-all-transfers",
    getAllTransfersValidator(),
    validateInput,
    isLoggedIn,
    checkAccess(27),
    getAllTransfers
);

router.get(
    "/get-transfer",
    getTransferValidator(),
    validateInput,
    isLoggedIn,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(27, Number(req?.query?.companyId))(req, res, next);
    },
    getTransfer
);

router.post(
    "/add-transfer",
    addTransferValidator(),
    validateInput,
    isLoggedIn,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(28, Number(req?.body?.fromCompanyId))(req, res, next);
    },
    addTransfer
);

export default router;
