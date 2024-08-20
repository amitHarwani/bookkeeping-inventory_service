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
        if (body?.cursor) {
            /* ItemId should be greater than the last itemId fetched, and filtering by companyId, and the custom query */
            whereClause = and(
                and(
                    gt(items.itemId, body.cursor.itemId),
                    gt(items.updatedAt, body.cursor.updatedAt),
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

        let nextPageCursor;
        const lastItem = allItems?.[allItems.length - 1]
        if (lastItem) {
            nextPageCursor = {
                itemId: lastItem?.itemId /* Pass the last item id & Date to get the next page */,
                updatedAt: lastItem.updatedAt as Date,
            };
        }
        return res.status(200).json(
            new ApiResponse<GetAllItemsResponse>(200, {
                items: allItems,
                nextPageCursor: nextPageCursor,
                hasNextPage: nextPageCursor ? true : false
            })
        );
    }
);

export const addItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddItemRequest;

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
                unitId: body.unitId,
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
                stock: body.stock.toString(),
            })
            .returning();

        return res.status(201).json(
            new ApiResponse<AddItemResponse>(201, {
                item: itemAdded[0],
                message: "item added successfully",
            })
        );
    }
);

export const updateItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdateItemRequest;

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
                unitId: body.unitId,
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
                stock: body.stock.toString(),
                updatedAt: new Date(),
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
