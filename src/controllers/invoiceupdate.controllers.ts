import { items, saleItemProfits } from "db_service";
import { db, DBType, Item } from "../db";
import { and, eq, isNull } from "drizzle-orm";
import { ApiError } from "../utils/ApiError";
import asyncHandler from "../utils/async_handler";
import { NextFunction, Request, Response } from "express";
import {
    RecordSaleRequest,
    RecordSaleResponse,
} from "../dto/invoiceupdate/record_sale_dto";
import {
    CostOfItemsForSaleItemsType,
    ItemTypeForRecordingPurchase,
    PriceHistoryOfCurrentStockType,
    SaleItemProfitDetails,
} from "../constants";
import { PriceHistoryUpdateHelper } from "../utils/PriceHistoryUpdateHelper";
import { ApiResponse } from "../utils/ApiResponse";
import {
    RecordPurchaseRequest,
    RecordPurchaseResponse,
} from "../dto/invoiceupdate/record_purchase_dto";
import {
    PostgresJsQueryResultHKT,
    PostgresJsTransaction,
} from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";

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

const adjustSaleItemsForRecordingPurchase = async (
    tx: DBType,
    companyId: number,
    purchaseItem: ItemTypeForRecordingPurchase,
    purchaseId: number
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
                    isNull(saleItemProfits.totalProfit)
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
            saleItem.purchaseIds.push(purchaseId);

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

// export const recordPurchaseUpdate = asyncHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const body = req.body as RecordPurchaseUpdateRequest;

//         await db.transaction(async (tx) => {
//             /* Item Additions */
//             if (Array.isArray(body?.items?.itemsAdded)) {
//                 await recordPurchaseAdditions(
//                     tx,
//                     body.items.itemsAdded,
//                     body.purchaseId
//                 );
//             }

//             /* Item Updates */
//             if (Array.isArray(body?.items?.itemsUpdated)) {
//                 for (const itemUpdate of body.items.itemsUpdated) {
//                     const oldItem = itemUpdate.old;
//                     const newItem = itemUpdate.new;

//                     /* Finding the item in DB */
//                     const itemFound = await tx
//                         .select()
//                         .from(items)
//                         .where(
//                             and(
//                                 eq(items.itemId, oldItem.itemId),
//                                 eq(items.companyId, oldItem.companyId)
//                             )
//                         );
//                     /* Item Not Found */
//                     if (!itemFound.length) {
//                         throw new ApiError(
//                             404,
//                             `invalid item with id: ${oldItem.itemId}`,
//                             []
//                         );
//                     }
//                     /* Item */
//                     const item = itemFound[0];

//                     /* Price History array of the item */
//                     const itemPriceHistory =
//                         item.priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[];

//                     /* Finding in price history array the purchase */
//                     const purchasePriceObjIndex = itemPriceHistory.findIndex(
//                         (history) => history.purchaseId == body.purchaseId
//                     );

//                     /* If the purchase is found in price history */
//                     if (purchasePriceObjIndex != -1) {
//                         /* Purchase price object */
//                         const purchasePriceObj =
//                             itemPriceHistory[purchasePriceObjIndex];

//                         /* Stock === old purchase, No sold or adjusted items */
//                         if (purchasePriceObj.stock == oldItem.unitsPurchased) {
//                             /* Direct Update */
//                             purchasePriceObj.stock = newItem.unitsPurchased;
//                             purchasePriceObj.purchasePrice =
//                                 newItem.pricePerUnit;

//                             item.stock = (
//                                 Number(item.stock) -
//                                 oldItem.unitsPurchased +
//                                 newItem.unitsPurchased
//                             ).toString();

//                             itemPriceHistory[purchasePriceObjIndex] =
//                                 purchasePriceObj;
//                             /* Update Item Here */
//                             await tx
//                                 .update(items)
//                                 .set({
//                                     stock: item.stock,
//                                     priceHistoryOfCurrentStock:
//                                         itemPriceHistory,
//                                 })
//                                 .where(
//                                     and(
//                                         eq(items.itemId, item.itemId),
//                                         eq(items.companyId, item.companyId)
//                                     )
//                                 );
//                         } else {
//                             /* Some items were sold and this must be the first item as items are adjusted/sold in FIFO  */
//                             const numOfItemsSoldOrAdjusted =
//                                 oldItem.unitsPurchased - purchasePriceObj.stock;

//                             let counter = numOfItemsSoldOrAdjusted;
//                             while (
//                                 counter != 0 &&
//                                 itemPriceHistory.length > 1
//                             ) {
//                                 itemPriceHistory[1].stock;
//                             }
//                         }
//                     } else {
//                     }
//                 }
//             }
//         });
//     }
// );
