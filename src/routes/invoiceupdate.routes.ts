import { Router } from "express";
import {
    recordPurchaseUpdateValidator,
    recordPurchaseValidator,
    recordSaleUpdateValidator,
    recordSaleValidator,
} from "../validators/invoiceupdate.validators";
import { validateInput } from "../validators";
import {
    recordPurchase,
    recordPurchaseUpdate,
    recordSale,
    recordSaleUpdate,
} from "../controllers/invoiceupdate.controllers";

const router = Router();

router.patch("/record-sale", recordSaleValidator(), validateInput, recordSale);

router.patch(
    "/record-purchase",
    recordPurchaseValidator(),
    validateInput,
    recordPurchase
);

router.patch(
    "/record-purchase-update",
    recordPurchaseUpdateValidator(),
    validateInput,
    recordPurchaseUpdate
);

router.patch(
    "/record-sale-update",
    recordSaleUpdateValidator(),
    validateInput,
    recordSaleUpdate
);

export default router;
