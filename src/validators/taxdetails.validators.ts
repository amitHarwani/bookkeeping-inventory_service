import { body, param } from "express-validator"


export const getTaxDetailByTaxIdValidator = () => {
    return [
        param("taxId")
            .exists()
            .withMessage("tax id is required")
            .toInt() // params come as string
            .isInt()
            .withMessage("invalid tax id")
    ]
}

export const getTaxDetailsOfCountryValidator = () => {
    return [
        param("countryId")
            .exists()
            .withMessage("country id is required")
            .toInt()
            .isInt()
            .withMessage("invalid country id")
    ]
}

export const addTaxDetailValidator = () => {
    return [
        body("taxName")
            .isString()
            .withMessage("invalid tax name")
            .trim()
            .notEmpty()
            .withMessage("tax name is required")
            .escape(),
        body("countryId")
            .isInt()
            .withMessage("invalid country id"),
        body("taxPercentage")
            .isNumeric()
            .withMessage("invalid tax percentage"),
        body("taxNickname")
            .isString()
            .withMessage("invalid tax name")
            .trim()
            .notEmpty()
            .withMessage("tax name is required")
            .escape(),
        body("isTaxOnInvoice")
            .isBoolean()
            .withMessage("invalid isTaxOnInvoice field"),
        body("isRegistrationOptional")
            .isBoolean()
            .withMessage("invalid isRegistrationOptional field")
        
    ]
}


export const updateTaxDetailValidator = () => {
    return [
        body("taxId")
            .isInt()
            .withMessage("tax id is required"),
        body("taxName")
            .isString()
            .withMessage("invalid tax name")
            .trim()
            .notEmpty()
            .withMessage("tax name is required")
            .escape(),
        body("countryId")
            .isInt()
            .withMessage("invalid country id"),
        body("taxPercentage")
            .isNumeric()
            .withMessage("invalid tax percentage"),
        body("taxNickname")
            .isString()
            .withMessage("invalid tax name")
            .trim()
            .notEmpty()
            .withMessage("tax name is required")
            .escape(),
        body("isTaxOnInvoice")
            .isBoolean()
            .withMessage("invalid isTaxOnInvoice field"),
        body("isRegistrationOptional")
            .isBoolean()
            .withMessage("invalid isRegistrationOptional field")
        
    ]
}