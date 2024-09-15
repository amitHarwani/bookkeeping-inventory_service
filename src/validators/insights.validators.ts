import { body } from "express-validator";

export const getLowStockItemsValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid company id"),
        body("pageSize").isInt().withMessage("invalid page size"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.itemId === "number")
            ) {
                return true;
            }
            throw new Error("invalid cursor field");
        }),
    ];
};
