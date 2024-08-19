import { body, param } from "express-validator";

export const addFeatureValidator = () => {
    return [
        body("featureName")
            .trim()
            .isString()
            .notEmpty()
            .withMessage("invalid feature name"),
        body("isEnabled").isBoolean().withMessage("invalid isEnabled field"),
        body("isSystemAdminFeature")
            .isBoolean()
            .withMessage("isSystemAdminFeature field not found or invalid"),
        body("dependentFeatureId").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid dependentFeatureId field");
        }),
    ];
};

export const updateFeatureValidator = () => {
    return [
        body("featureId").isNumeric().withMessage("invalid feature id"),
        body("featureName")
            .trim()
            .isString()
            .notEmpty()
            .withMessage("invalid feature name"),
        body("isEnabled").isBoolean().withMessage("invalid isEnabled field"),
        body("isSystemAdminFeature")
            .isBoolean()
            .withMessage("isSystemAdminFeature field not found or invalid"),
        body("dependentFeatureId").custom((value) => {
            if (!value || typeof value === "number") {
                return true;
            }
            throw new Error("invalid dependentFeatureId field");
        }),
    ];
};

export const getAllFeaturesValidator = () => {
    return [
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    (typeof value?.isEnabled === "boolean" ||
                        typeof value?.isSystemAdminFeature === "boolean"))
            ) {
                return true;
            }
            throw new Error("invalid query");
        }),
    ];
};

export const getFeatureByIdValidator = () => {
    return [
        param("featureId")
            .exists()
            .withMessage("featureId is required as path param")
            .toInt()
            .isInt()
            .withMessage("invalid feature id"),
    ];
};

export const getMultipleFeaturesByIdValidator = () => {
    return [
        body("featureIds")
            .isArray({ min: 1 })
            .withMessage("invalid feature ids"),
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    (typeof value?.isEnabled === "boolean" ||
                        typeof value?.isSystemAdminFeature === "boolean"))
            ) {
                return true;
            }
            throw new Error("invalid query");
        }),
    ];
};
