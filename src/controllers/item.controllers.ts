import { itemAdjustments, items } from "db_service";
import {
    and,
    asc,
    desc,
    eq,
    getTableColumns,
    gt,
    ilike,
    lt,
    or,
    sql,
} from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { ADJUSTMENT_TYPES, ItemTypeForRecordingPurchase } from "../constants";
import { db } from "../db";
import { AddItemRequest, AddItemResponse } from "../dto/item/add_item_dto";
import {
    AdjustItemRequest,
    AdjustItemResponse,
} from "../dto/item/adjust_item_dto";
import {
    GetAllItemsRequest,
    GetAllItemsResponse,
} from "../dto/item/get_all_items_dto";
import { GetItemResponse } from "../dto/item/get_item_dto";
import {
    UpdateItemRequest,
    UpdateItemResponse,
} from "../dto/item/update_item_dto";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/async_handler";
import { subtractPriceHistoryOfCurrentStock } from "../utils/item.helpers";
import { adjustSaleItemsForRecordingPurchase } from "./invoiceupdate.controllers";

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
            if (
                typeof body.query?.itemNameSearchQuery === "string" &&
                body.query?.itemNameSearchQuery
            ) {
                itemNameQuery = ilike(
                    items.itemName,
                    `%${body.query.itemNameSearchQuery}%`
                );
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
                        gt(items.itemId, body.cursor.itemId)
                    )
                ),
                eq(items.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* Default columns to select */
        let cols = { itemId: items.itemId, updatedAt: items.updatedAt };

        /* All Item Columns */
        const itemColumns = getTableColumns(items);

        /* All the column names  */
        const itemColumnKeys = Object.keys(itemColumns);

        /* If select is passed */
        if (body?.select) {
            /* For each columnName passed */
            body.select?.forEach((col) => {
                /* If the columnName is invalid, throw error */
                if (!itemColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid select column ${col}`, []);
                }
                /* Add in cols object */
                cols = { ...cols, [col]: items[col] };
            });
        } else {
            /* Select all columns  */
            cols = itemColumns;
        }
        /* Query */
        const allItems = await db
            .select(cols)
            .from(items)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(desc(items.updatedAt), asc(items.itemId));

        let nextPageCursor;
        const lastItem = allItems?.[allItems.length - 1];
        if (lastItem) {
            nextPageCursor = {
                itemId: lastItem?.itemId /* Pass the last item id & Date to get the next page */,
                updatedAt: lastItem.updatedAt as Date,
            };
        }
        return res.status(200).json(
            new ApiResponse<GetAllItemsResponse<typeof allItems>>(200, {
                items: allItems,
                nextPageCursor: nextPageCursor,
                hasNextPage: nextPageCursor ? true : false,
            })
        );
    }
);

export const getItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Item id and company id from request query  */
        const itemId = Number(req.query.itemId);
        const companyId = Number(req.query.companyId);

        /* Finding the item from items table */
        const itemFound = await db
            .select()
            .from(items)
            .where(
                and(eq(items.itemId, itemId), eq(items.companyId, companyId))
            );

        /* No items found error */
        if (!itemFound.length) {
            throw new ApiError(404, "item not found", []);
        }
        return res.status(200).json(
            new ApiResponse<GetItemResponse>(200, {
                item: itemFound[0],
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
                priceHistoryOfCurrentStock: body?.priceHistoryOfCurrentStock
                    ? body.priceHistoryOfCurrentStock
                    : [],
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

export const adjustItem = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AdjustItemRequest;

        /* Finding item from DB */
        const itemsFound = await db
            .select()
            .from(items)
            .where(eq(items.itemId, body.itemId));

        /* Item not found error */
        if (!itemsFound.length) {
            throw new ApiError(404, "item not found", []);
        }

        /* Updated item object */
        let updatedItem = { ...itemsFound[0] };
        await db.transaction(async (tx) => {

            /* Add type */
            if (body.adjustmentType === ADJUSTMENT_TYPES.ADD) {

                /* Object for adjusting sale items (As Adding stock is like a purchase) */
                const adjustSaleItemPurchaseObj: ItemTypeForRecordingPurchase = {
                    itemId: body.itemId,
                    pricePerUnit: body.pricePerUnit as number,
                    unitsPurchased: body.stockAdjusted
                }
                await adjustSaleItemsForRecordingPurchase(
                    tx,
                    body.companyId,
                    adjustSaleItemPurchaseObj,
                    null
                );

                /* Adding stock, converting to string as numeric types are returned as string from DB */
                updatedItem.stock = (
                    Number(updatedItem.stock) + body.stockAdjusted
                ).toString();

                /* If priceHistoryOfCurrentStock is present */
                if (updatedItem.priceHistoryOfCurrentStock) {
                    /* Push to the price history the current added stock along with the price per unit */
                    updatedItem.priceHistoryOfCurrentStock.push({
                        stock: adjustSaleItemPurchaseObj.unitsPurchased,
                        purchasePrice: adjustSaleItemPurchaseObj.pricePerUnit,
                        purchaseId: null
                    });
                } else {
                    /* Else store single element in priceHistoryOfStock */
                    updatedItem.priceHistoryOfCurrentStock = [
                        {
                            stock: adjustSaleItemPurchaseObj.unitsPurchased,
                            purchasePrice: adjustSaleItemPurchaseObj.pricePerUnit,
                            purchaseId: null
                        },
                    ];
                }
            } else {
                /* If current available stock is less than the stock being subtracted */
                if (Number(updatedItem.stock) - body.stockAdjusted < 0) {
                    throw new ApiError(
                        409,
                        "current stock is less than subtracted stock",
                        []
                    );
                }

                /* Updating stock */
                updatedItem.stock = (
                    Number(updatedItem.stock) - body.stockAdjusted
                ).toString();

                /* If price history of current stock exists, adjust and remove elements to subtract the stock */
                if (updatedItem.priceHistoryOfCurrentStock) {
                    updatedItem.priceHistoryOfCurrentStock =
                        subtractPriceHistoryOfCurrentStock(
                            updatedItem.priceHistoryOfCurrentStock,
                            body.stockAdjusted
                        );
                }
            }

            /* Inserting into itemAdjustments */
            await tx.insert(itemAdjustments).values({
                companyId: body.companyId,
                itemId: body.itemId,
                adjustmentType: body.adjustmentType,
                doneBy: req.user?.userId || "",
                reason: body.reason,
                stockAdjusted: body.stockAdjusted.toString(),
                pricePerUnit: body?.pricePerUnit
                    ? body.pricePerUnit.toString()
                    : null,
            });

            /* Adjusting sale items (Calculating their profits and adding to costOfItems if pending) */

            /* Updating the item in DB */
            const updatedItemInDB = await tx
                .update(items)
                .set({
                    stock: updatedItem.stock,
                    priceHistoryOfCurrentStock:
                        updatedItem.priceHistoryOfCurrentStock,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(items.itemId, updatedItem.itemId),
                        eq(items.companyId, updatedItem.companyId)
                    )
                )
                .returning();

            return res.status(200).json(
                new ApiResponse<AdjustItemResponse>(200, {
                    item: updatedItemInDB[0],
                    message: "item updated successfully",
                })
            );
        });
    }
);
