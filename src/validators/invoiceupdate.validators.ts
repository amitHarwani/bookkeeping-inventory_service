import { body } from "express-validator";

export const recordSaleValidator = () => {
    return [
        body("saleId").isInt().withMessage("invalid sale id"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("items").isArray().withMessage("invalid items field")
    ]
}
export const recordPurchaseValidator = () => {
    return [
        body("purchaseId").isInt().withMessage("invalid purchase id"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("items").isArray().withMessage("invalid items field")
    ];
};

export const recordPurchaseUpdateValidator = () => {
    return [
        body("purchaseId").isInt().withMessage("invalid purchase id"),
        body("items").custom((value) => {
            if (
                Array.isArray(value?.itemsAdded) ||
                Array.isArray(value?.itemsRemoved) ||
                Array.isArray(value?.itemsUpdated)
            ) {
                return true;
            }
            throw new Error("invalid field items");
        }),
    ];
};
