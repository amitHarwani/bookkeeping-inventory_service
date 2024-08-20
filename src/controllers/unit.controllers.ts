import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import { db } from "../db";
import { units } from "db_service";
import { and, eq, sql } from "drizzle-orm";
import { ApiResponse } from "../utils/ApiResponse";
import { GetAllUnitsResponse } from "../dto/unit/get_all_units_dto";
import { AddUnitRequest, AddUnitResponse } from "../dto/unit/add_unit_dto";
import { ApiError } from "../utils/ApiError";

export const getAllUnits = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const companyId = Number(req.params.companyId);

        /* Finding all units of a company */
        const allUnits = await db
            .select()
            .from(units)
            .where(eq(units.companyId, companyId));

        return res.status(200).json(
            new ApiResponse<GetAllUnitsResponse>(200, {
                units: allUnits,
            })
        );
    }
);

export const addUnit = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddUnitRequest;

        /* Checking if unit with the same name exists for the company */
        const isUnitExists = await db
            .select()
            .from(units)
            .where(
                and(
                    eq(
                        sql`lower(${units.unitName})`,
                        body.unitName.toLowerCase()
                    ),
                    eq(units.companyId, body.companyId)
                )
            );

        if (isUnitExists.length) {
            throw new ApiError(
                409,
                "unit with the same name already exists",
                []
            );
        }

        /* Adding the unit to DB */
        const unitAdded = await db
            .insert(units)
            .values({ unitName: body.unitName, companyId: body.companyId })
            .returning();

        return res.status(201).json(
            new ApiResponse<AddUnitResponse>(201, {
                unit: unitAdded[0],
                message: "unit added successfully",
            })
        );
    }
);
