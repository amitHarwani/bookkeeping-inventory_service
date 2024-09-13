import { items, saleItemProfits } from "db_service";
import { and, eq, isNull, not, notInArray, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import {
    CostOfItemsForSaleItemsType,
    ItemTypeForRecordingPurchase,
    PriceHistoryOfCurrentStockType,
    SaleItemProfitDetails,
} from "../constants";
import { db, DBType, Item } from "../db";
import {
    RecordPurchaseRequest,
    RecordPurchaseResponse,
} from "../dto/invoiceupdate/record_purchase_dto";
import {
    RecordPurchaseUpdateRequest,
    RecordPurchaseUpdateResponse,
} from "../dto/invoiceupdate/record_purchase_update_dto";
import {
    RecordSaleRequest,
    RecordSaleResponse,
} from "../dto/invoiceupdate/record_sale_dto";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/async_handler";
import { PriceHistoryUpdateHelper } from "../utils/PriceHistoryUpdateHelper";
import {
    RecordSaleUpdateRequest,
    RecordSaleUpdateResponse,
} from "../dto/invoiceupdate/record_sale_update_dto";
import logger from "../utils/logger";

const findItem = async (
    tx: DBType,
    itemId: number,
    companyId: number
): Promise<Item> => {
    try {
        /* Find Item */
        const itemsFound = await tx
            .select()
            .from(items)
            .where(
                and(eq(items.itemId, itemId), eq(items.companyId, companyId))
            );

        /* Invalid Item */
        if (!itemsFound.length) {
            throw new ApiError(404, `item not found ${itemId}`, []);
        }
        return itemsFound[0];
    } catch (error) {
        throw error;
    }
};
export const recordSale = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as RecordSaleRequest;

        /* To store sale item profit details as object where itemId is key, and profit details is the object */
        let allSaleItemProfitDetails: {
            [itemId: number]: SaleItemProfitDetails;
        } = {};

        await db.transaction(async (tx) => {
            /* For each sale item */
            for (let saleItem of body.items) {
                /* Finding the item in DB */
                const item = await findItem(
                    tx,
                    saleItem.itemId,
                    body.companyId
                );

                /* Calculating new stock and priceHistory */
                const priceHistoryUpdateHelper = new PriceHistoryUpdateHelper(
                    Number(item.stock),
                    item.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                );

                const saleTransactionDetails =
                    priceHistoryUpdateHelper.recordSales(saleItem);

                /* Storing profit details in allSaleItemProfitDetails object */
                allSaleItemProfitDetails[saleItem.itemId] =
                    saleTransactionDetails;

                /* Updating item in DB */
                await tx
                    .update(items)
                    .set({
                        stock: priceHistoryUpdateHelper.stock.toString(),
                        priceHistoryOfCurrentStock:
                            priceHistoryUpdateHelper.priceHistory,
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(items.itemId, saleItem.itemId),
                            eq(items.companyId, body.companyId)
                        )
                    );

                /* Adding to saleItemProfits */
                await tx.insert(saleItemProfits).values({
                    saleId: body.saleId,
                    itemId: saleItem.itemId,
                    companyId: body.companyId,
                    costOfItems: saleTransactionDetails.costOfItems,
                    purchaseIds: saleTransactionDetails.purchaseIds,
                    pricePerUnit: saleItem.sellingPricePerUnit.toString(),
                    unitsSold: saleItem.unitsSold.toString(),
                    remainingUnitsForProfitCalc:
                        saleTransactionDetails.remainingUnitsForProfitCalc.toString(),
                    totalProfit: saleTransactionDetails.profit
                        ? saleTransactionDetails.profit.toString()
                        : null,
                });
            }

            return res.status(200).json(
                new ApiResponse<RecordSaleResponse>(200, {
                    message: "sales recorded successfully",
                })
            );
        });
    }
);

const calculateSaleItemProfit = (
    costOfItems: Array<CostOfItemsForSaleItemsType>,
    sellingPricePerUnit: number,
    unitsSold: number
) => {
    let totalCost = 0;
    for (let cost of costOfItems) {
        //prettier-ignore
        totalCost += (cost.units * cost.pricePerUnit);
    }
    //prettier-ignore
    return (sellingPricePerUnit * unitsSold) - totalCost;
};

export const adjustSaleItemsForRecordingPurchase = async (
    tx: DBType,
    companyId: number,
    purchaseItem: ItemTypeForRecordingPurchase,
    purchaseId: number | null,
    extraWhereClause?: any
) => {
    try {
        /* Finding sale items where totalProfit is null, to adjust them with the new purchase */
        const saleItemsWithPendingProfit = await tx
            .select()
            .from(saleItemProfits)
            .where(
                and(
                    eq(saleItemProfits.itemId, purchaseItem.itemId),
                    eq(saleItemProfits.companyId, companyId),
                    isNull(saleItemProfits.totalProfit),
                    extraWhereClause
                )
            );

        /* For each sale item with null profit */
        for (let saleItem of saleItemsWithPendingProfit) {
            /* If purchaseItems units purchased is less than or equal to 0 break */
            if (purchaseItem.unitsPurchased <= 0) {
                break;
            }

            /* New remaining units */
            let updatedRemainingUnits: number;

            /* If remainingUnits in saleItem is less than or equal to the purchased units */
            if (
                Number(saleItem.remainingUnitsForProfitCalc) <=
                purchaseItem.unitsPurchased
            ) {
                /* Remaining units set to 0, as all units are going to be covered by this purchase */
                updatedRemainingUnits = 0;

                /* Update unitsPurchased after adjustment*/
                purchaseItem.unitsPurchased -= Number(
                    saleItem.remainingUnitsForProfitCalc
                );
            } else {
                /* Else subtracting unitsPurchased, as remainingUnits is greater than the units which are purchased */
                updatedRemainingUnits =
                    Number(saleItem.remainingUnitsForProfitCalc) -
                    purchaseItem.unitsPurchased;

                /* Setting unitsPurchased to 0, as all the units are adjusted */
                purchaseItem.unitsPurchased = 0;
            }

            /* Adding to purchaseIds array in saleItem */
            if (!Array.isArray(saleItem?.purchaseIds)) {
                saleItem.purchaseIds = [];
            }
            if (purchaseId) {
                saleItem.purchaseIds.push(purchaseId);
            }

            /* Adding to costOfItems array in saleItem */
            if (!Array.isArray(saleItem?.costOfItems)) {
                saleItem.costOfItems = [];
            }
            const newCostOfItem: CostOfItemsForSaleItemsType = {
                purchaseId: purchaseId,
                units:
                    Number(saleItem.remainingUnitsForProfitCalc) -
                    updatedRemainingUnits,
                pricePerUnit: purchaseItem.pricePerUnit,
            };
            saleItem.costOfItems.push(newCostOfItem);

            /* If no units are remaining, Calculating totalProfit */
            if (updatedRemainingUnits == 0) {
                saleItem.totalProfit = calculateSaleItemProfit(
                    saleItem.costOfItems as CostOfItemsForSaleItemsType[],
                    Number(saleItem.pricePerUnit),
                    Number(saleItem.unitsSold)
                ).toString();
            }

            /* Updating saleItemProfits */
            await tx
                .update(saleItemProfits)
                .set({
                    totalProfit: saleItem.totalProfit,
                    costOfItems: saleItem.costOfItems,
                    purchaseIds: saleItem.purchaseIds,
                    remainingUnitsForProfitCalc:
                        updatedRemainingUnits.toString(),
                })
                .where(
                    and(
                        eq(saleItemProfits.saleId, saleItem.saleId as number),
                        eq(saleItemProfits.itemId, saleItem.itemId as number)
                    )
                );
        }
    } catch (error) {
        throw error;
    }
};

export const recordPurchase = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as RecordPurchaseRequest;

        await db.transaction(async (tx) => {
            /* For each purchaseItem */
            for (let purchaseItem of body.items) {
                /* Finding the item */
                const item = await findItem(
                    tx,
                    purchaseItem.itemId,
                    body.companyId
                );

                /* Number of units purchased actually */
                const unitsPurchasedBeforeSaleAdjustment =
                    purchaseItem.unitsPurchased;

                /* Adjusting for sales where items were not available but sold */
                await adjustSaleItemsForRecordingPurchase(
                    tx,
                    body.companyId,
                    purchaseItem,
                    body.purchaseId
                );

                /* Getting the updated stock and priceHistory */
                const priceHistoryUpdateHelper = new PriceHistoryUpdateHelper(
                    Number(item.stock),
                    item.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                );

                priceHistoryUpdateHelper.recordPurchase(
                    body.purchaseId,
                    purchaseItem,
                    unitsPurchasedBeforeSaleAdjustment
                );

                /* Updating the item */
                await tx
                    .update(items)
                    .set({
                        stock: priceHistoryUpdateHelper.stock.toString(),
                        priceHistoryOfCurrentStock:
                            priceHistoryUpdateHelper.priceHistory,
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(items.itemId, purchaseItem.itemId),
                            eq(items.companyId, body.companyId)
                        )
                    );
            }

            return res.status(200).json(
                new ApiResponse<RecordPurchaseResponse>(200, {
                    message: "items stock updated successfully",
                })
            );
        });
    }
);

const adjustSaleItemsForRecordingPurchaseUpdate = async (
    tx: DBType,
    purchaseId: number,
    companyId: number,
    itemId: number,
    newPurchasePricesForSoldItems: Array<{
        purchaseId: number | null;
        units: number;
        pricePerUnit: number;
    }>
) => {
    try {
        /* Finding sale items which use the purchaseId passed */
        const saleItemsWithSamePurchaseId = await tx
            .select()
            .from(saleItemProfits)
            .where(
                and(
                    sql`${purchaseId} = ANY(${saleItemProfits.purchaseIds})`,
                    eq(saleItemProfits.companyId, companyId),
                    eq(saleItemProfits.itemId, itemId)
                )
            );

        for (let saleItem of saleItemsWithSamePurchaseId) {
            /* Finding the purchaseId */
            const costOfItems =
                saleItem.costOfItems as CostOfItemsForSaleItemsType[];

            /* Index of the purchaseId in costOfItems list */
            const costPurchaseIndex = costOfItems.findIndex(
                (costItem) => costItem.purchaseId == purchaseId
            );

            /* Purchase Object in costOfItems */
            const costPurchaseObj = costOfItems[costPurchaseIndex];

            /* Removing the purchaseObject from costOfItems */
            costOfItems.splice(costPurchaseIndex, 1);

            if(!Array.isArray(saleItem.purchaseIds)){
                saleItem.purchaseIds = []
            }
            /* Removing the purchaseId from purchaseIds list */
            const purchaseIdIndex = saleItem.purchaseIds.findIndex(
                (id) => id == purchaseId
            );

            if (purchaseIdIndex != -1) {
                saleItem.purchaseIds?.splice(purchaseIdIndex, 1);
            }

            /* Counter to adjust from newPurchasePrices */
            let counter =
                costPurchaseObj.units +
                Number(saleItem.remainingUnitsForProfitCalc);

            /* Looping to adjust the units from the purchaseId */
            while (counter > 0 && newPurchasePricesForSoldItems.length) {
                if (newPurchasePricesForSoldItems[0].units > counter) {
                    costOfItems.push({
                        purchaseId:
                            newPurchasePricesForSoldItems[0]?.purchaseId ||
                            null,
                        pricePerUnit:
                            newPurchasePricesForSoldItems[0].pricePerUnit,
                        units: counter,
                    });
                    if (newPurchasePricesForSoldItems[0]?.purchaseId) {
                        /* Pushing purchase id */
                        saleItem.purchaseIds?.push(
                            newPurchasePricesForSoldItems[0]?.purchaseId
                        );
                    }
                    newPurchasePricesForSoldItems[0].units -= counter;

                    counter = 0;
                    break;
                } else {
                    costOfItems.push({
                        purchaseId:
                            newPurchasePricesForSoldItems[0]?.purchaseId ||
                            null,
                        pricePerUnit:
                            newPurchasePricesForSoldItems[0].pricePerUnit,
                        units: newPurchasePricesForSoldItems[0].units,
                    });
                    if (newPurchasePricesForSoldItems[0]?.purchaseId) {
                        /* Pushing purchase id */
                        saleItem.purchaseIds?.push(
                            newPurchasePricesForSoldItems[0]?.purchaseId
                        );
                    }
                    counter -= newPurchasePricesForSoldItems[0].units;

                    newPurchasePricesForSoldItems.shift();
                }
            }

            saleItem.costOfItems = costOfItems;

            /* Remaining Units = Old Remaining Units + counter (units left if any while adjusting the purchase) */
            const updatedRemainingUnitsForProfitCalc = counter;

            /* If no units are remaining for profit calc: Calculate total profit */
            if (updatedRemainingUnitsForProfitCalc == 0) {
                saleItem.totalProfit = calculateSaleItemProfit(
                    saleItem.costOfItems as CostOfItemsForSaleItemsType[],
                    Number(saleItem.pricePerUnit),
                    Number(saleItem.unitsSold)
                ).toString();
            } else {
                saleItem.totalProfit = null;
            }

            saleItem.remainingUnitsForProfitCalc =
                updatedRemainingUnitsForProfitCalc.toString();

            /* Updating saleItemProfits table */
            await tx
                .update(saleItemProfits)
                .set({
                    costOfItems: saleItem.costOfItems,
                    remainingUnitsForProfitCalc:
                        saleItem.remainingUnitsForProfitCalc,
                    totalProfit: saleItem.totalProfit,
                    purchaseIds: saleItem.purchaseIds,
                })
                .where(
                    and(
                        eq(saleItemProfits.saleId, saleItem.saleId as number),
                        eq(saleItemProfits.itemId, saleItem.itemId as number)
                    )
                );
        }
    } catch (error) {
        throw error;
    }
};

export const recordPurchaseUpdate = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as RecordPurchaseUpdateRequest;

        await db.transaction(async (tx) => {
            /* Items Updated */
            if (Array.isArray(body?.items?.itemsUpdated)) {
                for (const itemUpdate of body.items.itemsUpdated) {
                    /* Old Purchase Item */
                    const oldItem = itemUpdate.old;

                    /* New Purchase Item */
                    const newItem = itemUpdate.new;

                    /* Item  */
                    const itemFromDB = await findItem(
                        tx,
                        oldItem.itemId,
                        body.companyId
                    );

                    /* Getting updated stock and price history */
                    const priceHistoryUpdateHelper =
                        new PriceHistoryUpdateHelper(
                            Number(itemFromDB.stock),
                            itemFromDB.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                        );

                    const newPurchasePricesForSoldItems =
                        priceHistoryUpdateHelper.recordPurchaseUpdate(
                            body.purchaseId,
                            oldItem,
                            newItem
                        );

                    /* If newPurchasePrices are passed (Adjustment for sold units from this purchase item) */
                    if (
                        Array.isArray(newPurchasePricesForSoldItems) &&
                        newPurchasePricesForSoldItems.length
                    ) {
                        await adjustSaleItemsForRecordingPurchaseUpdate(
                            tx,
                            body.purchaseId,
                            body.companyId,
                            newItem.itemId,
                            newPurchasePricesForSoldItems
                        );
                    }
                    /* Updating the item */
                    await tx
                        .update(items)
                        .set({
                            stock: priceHistoryUpdateHelper.stock.toString(),
                            priceHistoryOfCurrentStock:
                                priceHistoryUpdateHelper.priceHistory,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(items.itemId, newItem.itemId),
                                eq(items.companyId, body.companyId)
                            )
                        );
                }
            }
            if (Array.isArray(body?.items?.itemsRemoved)) {
                /* For each removed item */
                for (let item of body.items.itemsRemoved) {
                    /* Finding the item from DB */
                    const itemFromDB = await findItem(
                        tx,
                        item.itemId,
                        body.companyId
                    );

                    const priceHistoryUpdateHelper =
                        new PriceHistoryUpdateHelper(
                            Number(itemFromDB.stock),
                            itemFromDB.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                        );

                    /* Getting updated stock and price history, and newPurchasePrices for any units sold from this purchaseItem */
                    const newPurchasePricesForSoldItems =
                        priceHistoryUpdateHelper.recordPurchaseUpdateItemDeletion(
                            body.purchaseId,
                            item
                        );

                    /* If newPurchasePrices for sold items is passed adjusting it in sale items */
                    if (
                        Array.isArray(newPurchasePricesForSoldItems) &&
                        newPurchasePricesForSoldItems.length
                    ) {
                        await adjustSaleItemsForRecordingPurchaseUpdate(
                            tx,
                            body.purchaseId,
                            body.companyId,
                            item.itemId,
                            newPurchasePricesForSoldItems
                        );
                    }

                    /* Updating the item */
                    await tx
                        .update(items)
                        .set({
                            stock: priceHistoryUpdateHelper.stock.toString(),
                            priceHistoryOfCurrentStock:
                                priceHistoryUpdateHelper.priceHistory,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(items.itemId, item.itemId),
                                eq(items.companyId, body.companyId)
                            )
                        );
                }
            }

            return res.status(200).json(
                new ApiResponse<RecordPurchaseUpdateResponse>(200, {
                    message: "purchase updated successfully",
                })
            );
        });
    }
);

export const recordSaleUpdate = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as RecordSaleUpdateRequest;

        await db.transaction(async (tx) => {
            /* Item Updates */
            if (Array.isArray(body?.items?.itemsUpdated)) {
                for (const itemUpdate of body.items.itemsUpdated) {
                    /* Old and new Item */
                    const oldItem = itemUpdate.old;
                    const newItem = itemUpdate.new;

                    /* Item from inventory table */
                    const itemFromDB = await findItem(
                        tx,
                        newItem.itemId,
                        body.companyId
                    );

                    /* Sale Item form DB */
                    const saleItemProfitFromDB = await tx
                        .select()
                        .from(saleItemProfits)
                        .where(
                            and(
                                eq(saleItemProfits.itemId, newItem.itemId),
                                eq(saleItemProfits.saleId, body.saleId),
                                eq(saleItemProfits.companyId, body.companyId)
                            )
                        );

                    const saleItemProfitDetails = saleItemProfitFromDB[0];

                    /* Price History Update Helper object */
                    const priceHistoryUpdateHelper =
                        new PriceHistoryUpdateHelper(
                            Number(itemFromDB.stock),
                            itemFromDB.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                        );

                    /* Adding the costOfItems back to inventory  */
                    if (
                        saleItemProfitDetails &&
                        Array.isArray(saleItemProfitDetails.costOfItems)
                    ) {
                        /* Adding to overall stock */
                        priceHistoryUpdateHelper.stock += Number(saleItemProfitDetails.unitsSold);

                        for (let costOfItem of saleItemProfitDetails.costOfItems) {
                            /* Cost of sale item object */
                            let costOfSaleItem =
                                costOfItem as CostOfItemsForSaleItemsType;

                            /* Record Purchase Object type */
                            const recordPurchaseObj = {
                                itemId: newItem.itemId,
                                pricePerUnit: costOfSaleItem.pricePerUnit,
                                unitsPurchased: costOfSaleItem.units,
                            };

                            /* Adjusting sale items if any of them are pending for profit calculation */
                            await adjustSaleItemsForRecordingPurchase(
                                tx,
                                body.companyId,
                                recordPurchaseObj,
                                costOfSaleItem.purchaseId as number | null,
                                not(eq(saleItemProfits.saleId, body.saleId))
                            );

                            /* Record purchase in inventory after adjustment */
                            priceHistoryUpdateHelper.addSoldUnitsBackToInventory(
                                costOfSaleItem.purchaseId as number | null,
                                recordPurchaseObj
                            );
                        }
                    }

                    /* Getting details to record the new sale item  */
                    const saleTransactionDetails =
                        priceHistoryUpdateHelper.recordSales(newItem);

                    /* Updating item in DB */
                    await tx
                        .update(items)
                        .set({
                            stock: priceHistoryUpdateHelper.stock.toString(),
                            priceHistoryOfCurrentStock:
                                priceHistoryUpdateHelper.priceHistory,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(items.itemId, newItem.itemId),
                                eq(items.companyId, body.companyId)
                            )
                        );

                    /* Updating in saleItemProfits */
                    await tx
                        .update(saleItemProfits)
                        .set({
                            costOfItems: saleTransactionDetails.costOfItems,
                            purchaseIds: saleTransactionDetails.purchaseIds,
                            pricePerUnit:
                                newItem.sellingPricePerUnit.toString(),
                            unitsSold: newItem.unitsSold.toString(),
                            remainingUnitsForProfitCalc:
                                saleTransactionDetails.remainingUnitsForProfitCalc.toString(),
                            totalProfit: saleTransactionDetails.profit
                                ? saleTransactionDetails.profit.toString()
                                : null,
                        })
                        .where(
                            and(
                                eq(saleItemProfits.itemId, newItem.itemId),
                                eq(saleItemProfits.saleId, body.saleId),
                                eq(saleItemProfits.companyId, body.companyId)
                            )
                        );
                }
            }
            if (Array.isArray(body?.items?.itemsRemoved)) {
                for (const item of body.items.itemsRemoved) {
                    /* Item from inventory table */
                    const itemFromDB = await findItem(
                        tx,
                        item.itemId,
                        body.companyId
                    );

                    /* Sale Item form DB */
                    const saleItemProfitFromDB = await tx
                        .select()
                        .from(saleItemProfits)
                        .where(
                            and(
                                eq(saleItemProfits.itemId, item.itemId),
                                eq(saleItemProfits.saleId, body.saleId),
                                eq(saleItemProfits.companyId, body.companyId)
                            )
                        );

                    const saleItemProfitDetails = saleItemProfitFromDB[0];

                    /* Price History Update Helper object */
                    const priceHistoryUpdateHelper =
                        new PriceHistoryUpdateHelper(
                            Number(itemFromDB.stock),
                            itemFromDB.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[]
                        );

                    /* Adding the costOfItems back to inventory  */
                    if (
                        saleItemProfitDetails &&
                        Array.isArray(saleItemProfitDetails.costOfItems)
                    ) {
                        for (let costOfItem of saleItemProfitDetails.costOfItems) {
                            /* Cost of sale item object */
                            let costOfSaleItem =
                                costOfItem as CostOfItemsForSaleItemsType;

                            /* Record Purchase Object type */
                            const recordPurchaseObj = {
                                itemId: item.itemId,
                                pricePerUnit: costOfSaleItem.pricePerUnit,
                                unitsPurchased: costOfSaleItem.units,
                            };

                            /* Adjusting sale items if any of them are pending for profit calculation */
                            await adjustSaleItemsForRecordingPurchase(
                                tx,
                                body.companyId,
                                recordPurchaseObj,
                                costOfSaleItem.purchaseId as number | null
                            );

                            /* Record purchase in inventory after adjustment */
                            priceHistoryUpdateHelper.recordPurchase(
                                costOfSaleItem.purchaseId as number | null,
                                recordPurchaseObj,
                                costOfSaleItem.units
                            );
                        }
                    }

                    /* Updating item in DB */
                    await tx
                        .update(items)
                        .set({
                            stock: priceHistoryUpdateHelper.stock.toString(),
                            priceHistoryOfCurrentStock:
                                priceHistoryUpdateHelper.priceHistory,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(items.itemId, item.itemId),
                                eq(items.companyId, body.companyId)
                            )
                        );

                    /* Deleting from saleItemProfits */
                    await tx
                        .delete(saleItemProfits)
                        .where(
                            and(
                                eq(saleItemProfits.itemId, item.itemId),
                                eq(saleItemProfits.saleId, body.saleId),
                                eq(saleItemProfits.companyId, body.companyId)
                            )
                        );
                }
            }

            return res.status(200).json(
                new ApiResponse<RecordSaleUpdateResponse>(200, {
                    message: "sale updated successfully in inventory",
                })
            );
        });
    }
);
