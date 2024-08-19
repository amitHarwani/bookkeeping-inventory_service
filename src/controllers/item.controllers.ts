import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetAllItemsRequest,
    GetAllItemsResponse,
} from "../dto/item/get_all_items_dto";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { items, units } from "db_service";
import { db } from "../db";
import { ApiResponse } from "../utils/ApiResponse";
import { AddItemRequest, AddItemResponse } from "../dto/item/add_item_dto";
import { ApiError } from "../utils/ApiError";
import {
    UpdateItemRequest,
    UpdateItemResponse,
} from "../dto/item/update_item_dto";

export const getAllItems = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllItemsRequest;

        let customQuery;

        /* Query is passed */
        if (body.query) {
            let isActiveQuery;
            let isStockLowQuery;
            /* Is active query */
            if (typeof body.query?.isActive === "boolean") {
                isActiveQuery = eq(items.isActive, body.query.isActive);
            }
            /* Is stock low query */
            if (typeof body.query?.isStockLow === "boolean") {
                isStockLowQuery = lt(items.stock, items.minStockToMaintain);
            }
            /* Combining the queries */
            customQuery = and(isActiveQuery, isStockLowQuery);
        }

        /* Where clause */
        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            /* ItemId should be greater than the last itemId fetched, and filtering by companyId, and the custom query */
            whereClause = and(
                and(
                    gt(items.itemId, body.cursor.itemId),
                    eq(items.companyId, body.companyId)
                ),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* Query */
        const allItems = await db
            .select()
            .from(items)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(asc(items.itemId));

        return res.status(200).json(
            new ApiResponse<GetAllItemsResponse>(200, {
                items: allItems,
                nextPageCursor: {
                    itemId: allItems[allItems.length - 1]
                        ?.itemId /* Pass the last item id to get the next page */,
                },
            })
        );
    }
);

export const addItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddItemRequest;

        /* Unit ID */
        let unitId;

        /* Finding the unit in units table */
        const unitFound = await db
            .select()
            .from(units)
            .where(
                eq(sql`lower(${units.unitName})`, body.unitName.toLowerCase())
            );

        /* If unit is not found */
        if (!unitFound.length) {
            /* Adding the unit and storing the returned id in unitId variable */
            const unitAdded = await db
                .insert(units)
                .values({ unitName: body.unitName })
                .returning();
            unitId = unitAdded[0].unitId;
        } else {
            /* Else: Unit ID is the id of the record found */
            unitId = unitFound[0].unitId;
        }

        /* Checking if item with duplicate name exists in the same company */
        const isItemExists = await db
            .select({ itemId: items.itemId })
            .from(items)
            .where(
                and(
                    eq(
                        sql`lower(${items.itemName})`,
                        body.itemName.toLowerCase()
                    ),
                    eq(items.companyId, body.companyId)
                )
            );

        /* Throw error if duplicate item exists */
        if (isItemExists.length) {
            throw new ApiError(
                409,
                "item with the same name already exists",
                []
            );
        }

        /* Adding item to db */
        const itemAdded = await db
            .insert(items)
            .values({
                itemName: body.itemName,
                unitId: unitId,
                companyId: body.companyId,
                defaultSellingPrice: body?.defaultSellingPrice
                    ? body.defaultSellingPrice.toString()
                    : null,
                defaultPurchasePrice: body?.defaultPurchasePrice
                    ? body.defaultPurchasePrice.toString()
                    : null,
                minStockToMaintain: body?.minStockToMaintain
                    ? body.minStockToMaintain
                    : null,
                isActive: body.isActive,
                stock: body.stock,
            })
            .returning();

        return res.status(200).json(
            new ApiResponse<AddItemResponse>(200, {
                item: itemAdded[0],
                message: "item added successfully",
            })
        );
    }
);

export const updateItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdateItemRequest;

        /* Unit ID */
        let unitId;

        /* Finding the unit in units table */
        const unitFound = await db
            .select()
            .from(units)
            .where(
                eq(sql`lower(${units.unitName})`, body.unitName.toLowerCase())
            );

        /* If unit is not found */
        if (!unitFound.length) {
            /* Adding the unit and storing the returned id in unitId variable */
            const unitAdded = await db
                .insert(units)
                .values({ unitName: body.unitName })
                .returning();
            unitId = unitAdded[0].unitId;
        } else {
            /* Else: Unit ID is the id of the record found */
            unitId = unitFound[0].unitId;
        }

        /* Checking if item with duplicate name exists in the same company */
        const isItemExists = await db
            .select({ itemId: items.itemId })
            .from(items)
            .where(
                and(
                    eq(
                        sql`lower(${items.itemName})`,
                        body.itemName.toLowerCase()
                    ),
                    eq(items.companyId, body.companyId)
                )
            );

        /* Throw error if duplicate item name exists with a different itemId  */
        if (isItemExists.length && isItemExists[0].itemId != body.itemId) {
            throw new ApiError(
                409,
                "item with the same name already exists",
                []
            );
        }

        /* Updating the item in db */
        const updatedItem = await db
            .update(items)
            .set({
                itemName: body.itemName,
                unitId: unitId,
                defaultSellingPrice: body?.defaultSellingPrice
                    ? body.defaultSellingPrice.toString()
                    : null,
                defaultPurchasePrice: body?.defaultPurchasePrice
                    ? body.defaultPurchasePrice.toString()
                    : null,
                minStockToMaintain: body?.minStockToMaintain
                    ? body.minStockToMaintain
                    : null,
                isActive: body.isActive,
                stock: body.stock,
            })
            .where(
                and(
                    eq(items.itemId, body.itemId),
                    eq(items.companyId, body.companyId)
                )
            )
            .returning();

        return res.status(200).json(
            new ApiResponse<UpdateItemResponse>(200, {
                item: updatedItem[0],
                message: "item updated successfully",
            })
        );
    }
);
