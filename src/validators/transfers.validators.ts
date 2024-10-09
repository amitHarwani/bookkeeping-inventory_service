import { body, query } from "express-validator";
import { REGEX } from "../constants";

export const getAllTransfersValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid company id"),
        body("pageSize").isInt().withMessage("invalid page size"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.transferId === "number" &&
                    value?.createdAt)
            ) {
                return true;
            }
            throw new Error("invalid cursor field");
        }),
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    (typeof value?.type === "string" ||
                        (typeof value?.fromDate &&
                            REGEX.dateWithTime.test(value?.fromDate) &&
                            typeof value?.toDate &&
                            REGEX.dateWithTime.test(value?.toDate))))
            ) {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const getTransferValidator = () => {
    return [
        query("companyId").isInt().withMessage("invalid company id"),
        query("transferId").isInt().withMessage("invalid transfer id"),
    ];
};

export const addTransferValidator = () => {
    return [
        body("fromCompanyId").isInt().withMessage("invalid from company id"),
        body("toCompanyId").isInt().withMessage("invalid to company id"),
        body("fromCompanyName")
            .isString()
            .withMessage("invalid from company name")
            .trim()
            .notEmpty()
            .withMessage("from company name is required")
            .escape(),
        body("toCompanyName")
            .isString()
            .withMessage("invalid to company name")
            .trim()
            .notEmpty()
            .withMessage("to company name is required")
            .escape(),
        body("items").isArray().withMessage("invalid transfer items passed"),
    ];
};
