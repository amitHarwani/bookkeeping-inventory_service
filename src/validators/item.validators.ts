import { body } from "express-validator";

export const getAllItemsValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid companyId"),
        body("pageSize").isInt().withMessage("invalid pageSize"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.itemId === "number" &&
                    value?.updatedAt)
            ) {
                return true;
            }
            throw new Error("invalid cursor field");
        }),
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    (typeof value?.isActive === "boolean" ||
                        typeof value?.isStockLow === "boolean"))
            ) {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const addItemValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid company id"),
        body("isActive").isBoolean().withMessage("invalid is active field"),
        body("itemName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("item name is required")
            .escape(),
        body("unitId").isInt().withMessage("invalid unitId field"),
        body("unitName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("unit name is required")
            .escape(),
        body("stock").isNumeric().withMessage("invalid stock field"),
        body("defaultSellingPrice").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid default selling price");
        }),
        body("defaultPurchasePrice").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid default purchase price");
        }),
        body("minStockToMaintain").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid minumum stock to maintain field");
        }),
    ];
};

export const updateItemValidator = () => {
    return [
        body("itemId").isInt().withMessage("invalid item id"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("isActive").isBoolean().withMessage("invalid is active field"),
        body("itemName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("item name is required")
            .escape(),
        body("unitId").isInt().withMessage("invalid unitId field"),
        body("unitName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("unit name is required")
            .escape(),
        body("stock").isNumeric().withMessage("invalid stock field"),
        body("defaultSellingPrice").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid default selling price");
        }),
        body("defaultPurchasePrice").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid default purchase price");
        }),
        body("minStockToMaintain").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid minumum stock to maintain field");
        }),
    ];
};
