import { body, param } from "express-validator";

export const getCountryByIdValidator = () => {
    return [
        param("countryId")
            .exists()
            .withMessage("country id is required")
            .toInt()
            .isInt()
            .withMessage("invalid country id"),
    ];
};

export const addCountryValidator = () => {
    return [
        body("countryName")
            .isString()
            .withMessage("invalid country name")
            .trim()
            .notEmpty()
            .withMessage("country name is required")
            .escape(),
        body("timezone")
            .isString()
            .withMessage("invalid timezone")
            .trim()
            .notEmpty()
            .withMessage("timezone is required")
            .escape(),
        body("phoneNumberCodes").isArray({min: 1}).withMessage("invalid phoneNumberCodes"),
        body("currency").isString().withMessage("invalid currency").trim().notEmpty().withMessage("currency is required").escape(),
        body("maxPhoneNumberDigits").isInt().withMessage("invalid maxPhoneNumberDigits")
    ];
};

export const updateCountryValidator = () => {
    return [
        body("countryId")
            .isInt()
            .withMessage("invalid country id"),
        body("countryName")
            .isString()
            .withMessage("invalid country name")
            .trim()
            .notEmpty()
            .withMessage("country name is required")
            .escape(),
        body("timezone")
            .isString()
            .withMessage("invalid timezone")
            .trim()
            .notEmpty()
            .withMessage("timezone is required")
            .escape(),
        body("phoneNumberCodes").isArray({min: 1}).withMessage("invalid phoneNumberCodes"),
        body("currency").isString().withMessage("invalid currency").trim().notEmpty().withMessage("currency is required").escape(),
        body("maxPhoneNumberDigits").isInt().withMessage("invalid maxPhoneNumberDigits")
    ]
}
