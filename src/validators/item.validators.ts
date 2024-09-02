import { body, query } from "express-validator";
import { ADJUSTMENT_TYPES } from "../constants";

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
                        typeof value?.isStockLow === "boolean" ||
                        typeof value?.itemNameSearchQuery === "string"))
            ) {
                return true;
            } else if (typeof value === "object") {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const getItemValidator = () => {
    return [
        query("itemId").isInt().withMessage("invalid item id"),
        query("companyId").isInt().withMessage("invalid company id"),
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
        body("priceHistoryOfCurrentStock").custom((value) => {
            /* If value is not present: null or undefined, or a
            single element is passed in array which is valid representing
            the price of opening stock */
            if (
                !value ||
                (Array.isArray(value) &&
                    value.length === 1 &&
                    typeof value[0].stock === "number" &&
                    typeof value[0].purchasePrice === "number")
            ) {
                return true;
            }
            throw new Error("invalid price history of stock");
        }),
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

export const adjustItemValidator = () => {
    return [
        body("itemId").isInt().withMessage("invalid item id"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("adjustmentType").custom((value) => {
            const isValidType = Object.values(ADJUSTMENT_TYPES).find(
                (type) => type == value
            );
            if (isValidType) {
                return true;
            }
            throw new Error("invalid adjustment type");
        }),
        body("stockAdjusted").custom((value) => {
            if(value && typeof value === "number" && value > 0){
                return true;
            }
            throw new Error("invalid value for stockAdjusted field")
        }),
        body("pricePerUnit").custom((value, { req }) => {
            /* If adjustmentType is add, pricePerUnit is required to be a number */
            if (
                req?.body?.adjustmentType === ADJUSTMENT_TYPES.ADD &&
                value &&
                typeof value === "number"
            ) {
                return true;
            }
            else if(req?.body?.adjustmentType === ADJUSTMENT_TYPES.SUBTRACT){
                return true;
            }
            throw new Error("price per unit is request for ADD adjustment");
        }),
        body("reason")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("reason is required")
            .escape(),
    ];
};

export const recordPurchaseValidator = () => {
    return [
        body("purchaseId").isInt().withMessage("invalid purchase id"),
        body("itemsPurchased").custom(value => {
            if(Array.isArray(value)){
                return true;
            }
            throw new Error("invalid field itemsPurchased");
        }) 
    ]
}
