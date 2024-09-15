import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import { db } from "../db";
import { items, saleItemProfits } from "db_service";
import { and, asc, between, desc, eq, gt, lt, lte, or, SQL, sql } from "drizzle-orm";
import {
    GetLowStockItemsRequest,
    GetLowStockItemsResponse,
} from "../dto/insights/get_low_stock_items_dto";
import { ApiResponse } from "../utils/ApiResponse";

export const getLowStockItems = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetLowStockItemsRequest;

        /* Where clause */
        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body?.cursor) {
            /* ItemId should be greater than the last itemId fetched
                stock should be less than minStockToMaintain (Item in low stock)
            */
            whereClause = and(
                gt(items.itemId, body.cursor.itemId),
                eq(items.companyId, body.companyId),
                lte(items.stock, items.minStockToMaintain)
            );
        } else {
            whereClause = and(
                eq(items.companyId, body.companyId),
                lte(items.stock, items.minStockToMaintain)
            );
        }

        /* Fetching low stock items */
        const lowStockItems = await db
            .select({
                itemId: items.itemId,
                itemName: items.itemName,
                stock: items.stock,
                minStockToMaintain: items.minStockToMaintain,
                difference:
                    sql`${items.minStockToMaintain} - ${items.stock}` as SQL<string>,
                unitName: items.unitName,
                updatedAt: items.updatedAt
            })
            .from(items)
            .where(whereClause)
            .orderBy(
                desc(sql`${items.minStockToMaintain} - ${items.stock}`),
                asc(items.itemId)
            )
            .limit(body.pageSize);

        /* Next Page Cursor */
        let nextPageCursor;

        /* If last item exists */
        const lastItem = lowStockItems?.[lowStockItems?.length - 1];

        /* Next page cursor, will be last items itemId */
        if (lastItem) {
            nextPageCursor = { itemId: lastItem.itemId };
        }

        return res.status(200).json(
            new ApiResponse<GetLowStockItemsResponse>(200, {
                lowStockItems: lowStockItems,
                nextPageCursor: nextPageCursor,
            })
        );
    }
);
