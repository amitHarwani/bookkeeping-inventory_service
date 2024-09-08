import { Router } from "express";
import { recordPurchaseValidator, recordSaleValidator } from "../validators/invoiceupdate.validators";
import { validateInput } from "../validators";
import { recordPurchase, recordSale } from "../controllers/invoiceupdate.controllers";

const router = Router();

router.patch("/record-sale", recordSaleValidator(), validateInput, recordSale);

router.patch(
    "/record-purchase",
    recordPurchaseValidator(),
    validateInput,
    recordPurchase
);


export default router;