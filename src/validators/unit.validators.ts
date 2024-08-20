import { body, param } from "express-validator";

export const getAllUnitsValidator = () => {
    return [param("companyId").isInt().withMessage("invalid companyId passed")];
};

export const addUnitValidator = () => {
    return [
        body("unitName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("unit name is required")
            .escape(),
        body("companyId").isInt().withMessage("invalid companyId field")
    ];
};
