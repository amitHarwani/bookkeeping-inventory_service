import { Router } from "express";
import { recordPurchaseUpdateValidator, recordPurchaseValidator, recordSaleValidator } from "../validators/invoiceupdate.validators";
import { validateInput } from "../validators";
import { recordPurchase, recordPurchaseUpdate, recordSale } from "../controllers/invoiceupdate.controllers";

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
)

export default router;