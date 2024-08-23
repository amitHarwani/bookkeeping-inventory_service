import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetAllItemsRequest,
    GetAllItemsResponse,
} from "../dto/item/get_all_items_dto";
import { and, asc, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
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
            let itemNameQuery;
            /* Is active query */
            if (typeof body.query?.isActive === "boolean") {
                isActiveQuery = eq(items.isActive, body.query.isActive);
            }
            /* Is stock low query */
            if (typeof body.query?.isStockLow === "boolean") {
                isStockLowQuery = lt(items.stock, items.minStockToMaintain);
            }

            /* Item name search */
            if(typeof body.query?.itemNameSearchQuery === "string" && body.query?.itemNameSearchQuery){
                itemNameQuery = ilike(items.itemName, `%${body.query.itemNameSearchQuery}%`);
            }
            /* Combining the queries */
            customQuery = and(isActiveQuery, isStockLowQuery, itemNameQuery);
        }

        /* Where clause */
        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body?.cursor) {
            /* ItemId should be greater than the last itemId fetched, and updatedAt must be equal to the lastUpdatedAt fetched
            or updatedAt should be less than the last updatedAt fetched, since item are ordered by updated at.
            and filtering by companyId, and the custom query */
            whereClause = and(
                or(
                    sql`${items.updatedAt} < ${body.cursor.updatedAt}`,
                    and(
                        sql`${items.updatedAt} = ${body.cursor.updatedAt}`,
                        gt(items.itemId, body.cursor.itemId),
                    )
                ),
                eq(items.companyId, body.companyId),
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
            .orderBy(desc(items.updatedAt), asc(items.itemId));

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
                unitName: body.unitName,
                companyId: body.companyId,
                defaultSellingPrice: body?.defaultSellingPrice
                    ? body.defaultSellingPrice.toString()
                    : null,
                defaultPurchasePrice: body?.defaultPurchasePrice
                    ? body.defaultPurchasePrice.toString()
                    : null,
                minStockToMaintain: body?.minStockToMaintain
                    ? body.minStockToMaintain
                    : 0,
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
                unitName: body.unitName,
                defaultSellingPrice: body?.defaultSellingPrice
                    ? body.defaultSellingPrice.toString()
                    : null,
                defaultPurchasePrice: body?.defaultPurchasePrice
                    ? body.defaultPurchasePrice.toString()
                    : null,
                minStockToMaintain: body?.minStockToMaintain
                    ? body.minStockToMaintain
                    : 0,
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
