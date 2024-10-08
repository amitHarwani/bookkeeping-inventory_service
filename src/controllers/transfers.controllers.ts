import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetAllTransfersRequest,
    GetAllTransfersResponse,
} from "../dto/transfers/get_all_transfers_dto";
import {
    and,
    asc,
    between,
    desc,
    eq,
    getTableColumns,
    gt,
    or,
    sql,
} from "drizzle-orm";
import { transfers as transfersTable, transferItems, items } from "db_service";
import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { ApiResponse } from "../utils/ApiResponse";
import { GetTransferResponse } from "../dto/transfers/get_transfer_dto";
import { AddTransferRequest } from "../dto/transfers/add_transfer_dto";
import { PriceHistoryOfCurrentStockType } from "../constants";

export const getAllTransfers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllTransfersRequest;

        /* Custom Query */
        let customQuery;

        if (body?.query) {
            let typeQuery;
            let dateQuery;

            /* Type Query */
            if (["ALL", "RECEIVED", "SENT"].includes(body?.query?.type)) {
                /* Transfers which were received  */
                if (body.query.type === "RECEIVED") {
                    typeQuery = eq(transfersTable.toCompanyId, body.companyId);
                } else if (body.query.type === "SENT") {
                    /* Transfers sent */
                    typeQuery = eq(
                        transfersTable.fromCompanyId,
                        body.companyId
                    );
                } else {
                    /* All Transfers */
                    typeQuery = or(
                        eq(transfersTable.fromCompanyId, body.companyId),
                        eq(transfersTable.toCompanyId, body.companyId)
                    );
                }
            }
            /* Date query */
            if (body?.query?.fromDate && body?.query?.toDate) {
                dateQuery = sql`${transfersTable.createdAt} >= ${body.query.fromDate} and ${transfersTable.createdAt} <= ${body.query.toDate}`;
            }
            customQuery = and(typeQuery, dateQuery);
        }

        /* Where clause */
        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body?.cursor) {
            /* transferId should be greater than the last transfer fetched, and createdAt must be equal to the last created at fetched
               or createdat should be less than the last createdAt fetched, since transfers are ordered by created at.
               */
            whereClause = and(
                or(
                    sql`${transfersTable.createdAt} < ${body.cursor.createdAt}`,
                    and(
                        sql`${transfersTable.createdAt} = ${body.cursor.createdAt}`,
                        gt(transfersTable.transferId, body.cursor.transferId)
                    )
                ),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* Default columns to select */
        let cols = {
            transferId: transfersTable.transferId,
            createdAt: transfersTable.createdAt,
        };

        /* All Transfer Columns */
        const transferColumns = getTableColumns(transfersTable);

        /* All the column names  */
        const transferColumnKeys = Object.keys(transferColumns);

        /* If select is passed */
        if (body?.select) {
            /* For each columnName passed */
            body.select?.forEach((col) => {
                /* If the columnName is invalid, throw error */
                if (!transferColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid select column ${col}`, []);
                }
                /* Add in cols object */
                cols = { ...cols, [col]: transfersTable[col] };
            });
        } else {
            /* Select all columns  */
            cols = transferColumns;
        }
        /* Query */
        const transfers = await db
            .select(cols)
            .from(transfersTable)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(
                desc(transfersTable.createdAt),
                asc(transfersTable.transferId)
            );

        let nextPageCursor;
        const lastItem = transfers?.[transfers.length - 1];
        if (lastItem) {
            nextPageCursor = {
                transferId:
                    lastItem?.transferId /* Pass the last transfer id & Date to get the next page */,
                createdAt: lastItem.createdAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllTransfersResponse<typeof transfers>>(200, {
                transfers: transfers,
                hasNextPage: nextPageCursor ? true : false,
                nextPageCursor: nextPageCursor,
            })
        );
    }
);

export const getTransfer = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Company ID and Transfer ID */
        const companyId = Number(req?.query?.companyId);
        const transferId = Number(req?.query?.transferId);

        /* Request to get data from item transfers table */
        const transferRequestFromDB = db
            .select()
            .from(transfersTable)
            .where(
                and(
                    eq(transfersTable.transferId, transferId),
                    or(
                        eq(transfersTable.fromCompanyId, companyId),
                        eq(transfersTable.toCompanyId, companyId)
                    )
                )
            );

        /* Getting the items transferred in the transfer */
        const transferItemsRequestFromDB = db
            .select()
            .from(transferItems)
            .where(eq(transferItems.transferId, transferId));

        /* DB Request */
        const [transferResponse, transferItemsResponse] = await Promise.all([
            transferRequestFromDB,
            transferItemsRequestFromDB,
        ]);

        /* If the transfer is not found, throw an error */
        if (!transferResponse || !transferResponse?.length) {
            throw new ApiError(404, "invalid transfer id or company id", []);
        }

        return res.status(200).json(
            new ApiResponse<GetTransferResponse>(200, {
                transfer: transferResponse[0],
                transferItems: transferItemsResponse,
            })
        );
    }
);

export const addTransfer = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddTransferRequest;

        await db.transaction(async (tx) => {

            /* Adding transfer to transfers table */
            const transferAdded = await tx
                .insert(transfersTable)
                .values({
                    fromCompanyId: body.fromCompanyId,
                    fromCompanyName: body.fromCompanyName,
                    toCompanyId: body.toCompanyId,
                    toCompanyName: body.toCompanyName,
                    doneBy: req.user?.userId as string,
                })
                .returning();

            /* For each transferred item */
            for (let item of body.items) {
                /* Item From Items Table (Sender) */
                const itemInDB = await tx
                    .select()
                    .from(items)
                    .where(
                        and(
                            eq(items.itemId, item.itemId),
                            eq(items.companyId, body.fromCompanyId)
                        )
                    );

                /* Item from Items Table (Receiver): Checking based on item name */
                const receiverItemInDB = await tx
                    .select()
                    .from(items)
                    .where(
                        and(
                            eq(items.companyId, body.toCompanyId),
                            eq(
                                sql`lower${items.itemName}`,
                                item.itemName.toLowerCase()
                            )
                        )
                    );
                
                /* If the item is not found in senders list of items, throw an error */
                if (!itemInDB.length) {
                    throw new ApiError(
                        404,
                        `invalid item passed: ${item.itemName}`,
                        []
                    );
                }

                /* Item in senders list of items */
                const itemFound = itemInDB[0];

                /* Insufficent stock error */
                if (Number(itemFound.stock) < item.unitsTransferred) {
                    throw new ApiError(
                        400,
                        `item:  ${item.itemName} doesn't have enough stock`,
                        []
                    );
                }

                /* Updated stock: Current stock - units transferred */
                const updatedStock =
                    Number(itemFound.stock) - item.unitsTransferred;

                /* To store updated price history of sender, receiver and the price history of transfer */
                const priceHistoryOfSender: PriceHistoryOfCurrentStockType[] =
                    itemFound.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[];
                const priceHistoryOfReceiver: PriceHistoryOfCurrentStockType[] =
                    (receiverItemInDB?.[0]
                        ?.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]) ||
                    [];

                const priceHistoryOfTransfer: PriceHistoryOfCurrentStockType[] =
                    [];

                /* Initializing counter to the units to be transferred */
                let counter = item.unitsTransferred;

                /* While counter is > 0 */
                while (counter > 0) {
                    /* If the first price history is greater than counter: 
                    All units can be transferred from this price history */
                    if (priceHistoryOfSender[0].stock > counter) {

                        /* Pushing to receiver and transfer price history */
                        priceHistoryOfReceiver.push({
                            stock: counter,
                            purchasePrice:
                                priceHistoryOfSender[0].purchasePrice,
                        });

                        priceHistoryOfTransfer.push({
                            stock: counter,
                            purchasePrice:
                                priceHistoryOfSender[0].purchasePrice,
                        });

                        /* Decrementing from senders price history */
                        priceHistoryOfSender[0].stock -= counter;

                        /* Breaking from the loop */
                        counter = 0;
                        break;
                    } else {

                        /* Else, emptying the first price histor in sender */

                        /* Pushing in receivers and transfers price history */
                        priceHistoryOfReceiver.push({
                            stock: priceHistoryOfSender[0].stock,
                            purchasePrice:
                                priceHistoryOfSender[0].purchasePrice,
                        });

                        priceHistoryOfTransfer.push({
                            stock: priceHistoryOfSender[0].stock,
                            purchasePrice:
                                priceHistoryOfSender[0].purchasePrice,
                        });

                        /* Decrementing counter */
                        counter -= priceHistoryOfSender[0].stock;

                        /* Removing the history from price history of sender */
                        priceHistoryOfSender.shift();
                    }
                }

                /* Updating senders inventory  */
                await tx
                    .update(items)
                    .set({
                        stock: updatedStock.toString(),
                        priceHistoryOfCurrentStock: priceHistoryOfSender,
                    })
                    .where(
                        and(
                            eq(items.itemId, item.itemId),
                            eq(items.companyId, body.fromCompanyId)
                        )
                    );

                /* If item does not exist in receivers inventory: Add the item */
                if (!receiverItemInDB.length) {
                    await tx.insert(items).values({
                        companyId: body.toCompanyId,
                        itemName: item.itemName,
                        stock: item.unitsTransferred.toString(),
                        unitId: item.unitId,
                        unitName: item.unitName,
                        isActive: true,
                        priceHistoryOfCurrentStock: priceHistoryOfReceiver,
                        minStockToMaintain: "0",
                    });
                } else {
                    /* Else update the stock and price history */
                    await tx.update(items).set({
                        stock: (
                            Number(receiverItemInDB[0].stock) +
                            item.unitsTransferred
                        ).toString(),
                        priceHistoryOfCurrentStock: priceHistoryOfReceiver,
                    });
                }

                /* Inserting into transfer items table */
                await tx.insert(transferItems).values({
                    itemId: item.itemId,
                    itemName: item.itemName,
                    transferId: transferAdded[0].transferId,
                    unitId: item.unitId,
                    unitName: item.unitName,
                    unitsTransferred: item.unitsTransferred.toString(),
                    priceHistoryOfStockTransferred: priceHistoryOfTransfer,
                });
            }
        });
    }
);
