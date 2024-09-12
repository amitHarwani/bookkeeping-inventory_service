import {
    CostOfItemsForSaleItemsType,
    ItemTypeForRecordingPurchase,
    ItemTypeForRecordingSale,
    PriceHistoryOfCurrentStockType,
    SaleItemProfitDetails,
} from "../constants";

export class PriceHistoryUpdateHelper {
    constructor(
        public stock: number,
        public priceHistory: Array<PriceHistoryOfCurrentStockType> | null
    ) {}

    recordSales = (item: ItemTypeForRecordingSale): SaleItemProfitDetails => {
        /* New stock = Old Stock - Units Sold */
        this.stock -= item.unitsSold;

        /* Counter for price history update */
        let counter = item.unitsSold;

        /* To store the cost of items as array */
        let costOfItems = [];

        /* Profit counter */
        let profit = 0;

        /* All Purchase IDs */
        let purchaseIds: Array<number> = [];

        /* While counter is not 0, and priceHistory is not empty */
        while (counter > 0 && this.priceHistory?.length) {
            /* FIFO Order: Hence the first item is taken first to subtract stock */
            const priceHistoryItem = this.priceHistory[0];

            /* If the priceHistoryItems stock is greater than counter: All stock can be subtracted from this priceHistory */
            if (priceHistoryItem.stock > counter) {
                /* Subtracting stock */
                priceHistoryItem.stock -= counter;

                /* Pushing to costOfItems array */
                costOfItems.push({
                    purchaseId: priceHistoryItem?.purchaseId || null,
                    units: counter,
                    pricePerUnit: priceHistoryItem.purchasePrice,
                });

                /* If this priceHistory is from a purchase, push the purchaseId */
                if (priceHistoryItem?.purchaseId) {
                    purchaseIds.push(priceHistoryItem.purchaseId);
                }

                /* Calculating profit, by counter (Stock left) */
                //prettier-ignore
                profit +=
                    (item.sellingPricePerUnit * counter) -
                    (counter * priceHistoryItem.purchasePrice);

                /* Setting counter to 0, as all stock is accounted for in this priceHistory object */
                counter = 0;
                break;
            } else {
                /* Subtracting from counter, the priceHistoryItems stock */
                counter -= priceHistoryItem.stock;

                /* Pushing to costOfItems */
                costOfItems.push({
                    purchaseId: priceHistoryItem.purchaseId || null,
                    units: priceHistoryItem.stock,
                    pricePerUnit: priceHistoryItem.purchasePrice,
                });

                /* If this priceHistory is from a purchase, push the purchaseId */
                if (priceHistoryItem?.purchaseId) {
                    purchaseIds.push(priceHistoryItem.purchaseId);
                }

                /* Calculating profit, by priceHistoryItems stock */
                //prettier-ignore
                profit +=
                    (item.sellingPricePerUnit * priceHistoryItem.stock) -
                    (priceHistoryItem.stock * priceHistoryItem.purchasePrice);

                /* Removing the entire priceHistoryItem, as the entire stock is subtracted */
                this.priceHistory.shift();
            }
        }

        /* Returning cost of items, the profit, and if all units are covered in priceHistory or not */
        return {
            costOfItems,
            profit: counter === 0 ? profit : null,
            isAllUnitsCovered: counter > 0 ? false : true,
            remainingUnitsForProfitCalc: counter,
            purchaseIds: purchaseIds,
        };
    };

    recordPurchase = (
        purchaseId: number | null,
        item: ItemTypeForRecordingPurchase,
        unitsPurchasedBeforeSaleAdjustment: number
    ) => {
        /* Adding to overall stock */
        this.stock += unitsPurchasedBeforeSaleAdjustment;

        /* If priceHistory is not a array initializing it to an empty array */
        if (!Array.isArray(this.priceHistory)) {
            this.priceHistory = [];
        }

        /* If stock is not negative */
        if (this.stock > 0) {
            /* Pushing to price history */
            this.priceHistory.push({
                purchasePrice: item.pricePerUnit,
                stock: item.unitsPurchased,
                purchaseId: purchaseId,
            });
        }
    };

    recordPurchaseUpdate = (
        purchaseId: number,
        oldItem: ItemTypeForRecordingPurchase,
        newItem: ItemTypeForRecordingPurchase
    ) => {
        /* If price per unit, and units purchased are same, there is no need to update anything */
        if (
            oldItem.pricePerUnit == newItem.pricePerUnit &&
            oldItem.unitsPurchased == newItem.unitsPurchased
        ) {
            return;
        }

        if (!Array.isArray(this.priceHistory)) {
            this.priceHistory = [];
        }
        /* Finding the purchaseId in price history */
        const purchaseHistoryIndex = this.priceHistory.findIndex(
            (history) => history.purchaseId == purchaseId
        );

        /* Purchase History object */
        const purchaseHistory = this.priceHistory?.[purchaseHistoryIndex];

        let newPurchasePricesForSoldItems = [];

        /* If purchase history is not found or if the stocks don't match (Some items from this purchase are sold or adjusted) */
        if (
            purchaseHistoryIndex === -1 ||
            purchaseHistory?.stock != oldItem.unitsPurchased
        ) {
            /* Current stock in purchaseHistory, or 0, if purchaseHistory is not there */
            const currentPurchaseHistoryStock = purchaseHistory?.stock || 0;

            /* Num of units sold or adjusted */
            let numOfUnitsSoldOrAdjusted =
                oldItem.unitsPurchased - currentPurchaseHistoryStock;

            if(this.stock < 0){
                numOfUnitsSoldOrAdjusted = Math.abs(this.stock) + oldItem.unitsPurchased;
            }

            /* Updating old purchase history */
            if (purchaseHistoryIndex != -1) {
                this.priceHistory[purchaseHistoryIndex] = {
                    purchasePrice: newItem.pricePerUnit,
                    stock: newItem.unitsPurchased,
                    purchaseId: purchaseId,
                };
            } else {
                /* Adding the new purchase to priceHistory */
                this.priceHistory.push({
                    purchasePrice: newItem.pricePerUnit,
                    stock: newItem.unitsPurchased,
                    purchaseId: purchaseId,
                });
            }

            /* Adjusting the sold/adjusted units from purchaseHistories */
            let counter = numOfUnitsSoldOrAdjusted;

            /* While there are units to be adjusted and priceHistory is not empty */
            while (counter > 0 && this.priceHistory.length) {
                /* If the first priceHistories stock is > counter, all units can be adjusted from this priceHistory */
                if (this.priceHistory[0].stock > counter) {
                    /* Pushing to newPurchasePrices list */
                    newPurchasePricesForSoldItems.push({
                        purchaseId: this.priceHistory[0]?.purchaseId || null,
                        units: counter, // All units adjusted from first priceHistory
                        pricePerUnit: this.priceHistory[0].purchasePrice,
                    });

                    /* Subtracting stock from priceHistory */
                    this.priceHistory[0].stock -= counter;

                    /* Setting counter to 0: Remaining units to be adjusted */
                    counter = 0;
                    break;
                } else {
                    /* Pushing to newPurchasePrices list */
                    newPurchasePricesForSoldItems.push({
                        purchaseId: this.priceHistory[0]?.purchaseId || null,
                        units: this.priceHistory[0].stock,
                        pricePerUnit: this.priceHistory[0].purchasePrice,
                    });

                    /* Subtracting counter by the stock available in this priceHistory, and removing the item from priceHistory */
                    counter -= this.priceHistory[0].stock;
                    this.priceHistory.shift();
                }
            }
        } else {
            this.priceHistory[purchaseHistoryIndex] = {
                purchasePrice: newItem.pricePerUnit,
                stock: newItem.unitsPurchased,
                purchaseId: purchaseId,
            };

            /* If price is changed, passing in the new purchase price, this will be adjusted in saleItems table */
            if(purchaseHistory.purchasePrice != newItem.pricePerUnit){
                newPurchasePricesForSoldItems.push({
                    purchaseId: purchaseId, 
                    units: newItem.unitsPurchased,
                    pricePerUnit: newItem.pricePerUnit
                })
            }
        }

        /* Overall Stock = Current Overall - old Purchased Stock + new Purchase Stock */
        this.stock =
            this.stock - oldItem.unitsPurchased + newItem.unitsPurchased;

        return newPurchasePricesForSoldItems;
    };

    recordPurchaseUpdateItemDeletion = (
        purchaseId: number,
        purchaseItem: ItemTypeForRecordingPurchase
    ) => {
        if (!Array.isArray(this.priceHistory)) {
            this.priceHistory = [];
        }
        /* Finding the purchaseId in price history */
        const purchaseHistoryIndex = this.priceHistory.findIndex(
            (history) => history.purchaseId == purchaseId
        );

        /* Purchase History object */
        const purchaseHistory = this.priceHistory?.[purchaseHistoryIndex];

        let newPurchasePricesForSoldItems = [];

        if (
            purchaseHistoryIndex == -1 ||
            purchaseItem.unitsPurchased != purchaseHistory?.stock
        ) {
            /* Current stock in purchaseHistory, or 0, if purchaseHistory is not there */
            const currentPurchaseHistoryStock = purchaseHistory?.stock || 0;

            /* Num of units sold or adjusted */
            const numOfUnitsSoldOrAdjusted =
                purchaseItem.unitsPurchased - currentPurchaseHistoryStock;

            /* Removing the removed purchaseItem from price history */
            if (purchaseHistoryIndex != -1) {
                this.priceHistory.splice(purchaseHistoryIndex, 1);
            }

            /* Adjusting the sold/adjusted units from priceHistory */
            let counter = numOfUnitsSoldOrAdjusted;

            /* While there are units to be adjusted and priceHistory is not empty */
            while (counter > 0 && this.priceHistory.length) {
                /* If the first priceHistories stock is > counter, all units can be adjusted from this priceHistory */
                if (this.priceHistory[0].stock > counter) {
                    /* Pushing to newPurchasePrices list */
                    newPurchasePricesForSoldItems.push({
                        purchaseId: this.priceHistory[0]?.purchaseId || null,
                        units: counter, // All units adjusted from first priceHistory
                        pricePerUnit: this.priceHistory[0].purchasePrice,
                    });

                    /* Subtracting stock from priceHistory */
                    this.priceHistory[0].stock -= counter;

                    /* Setting counter to 0: Remaining units to be adjusted */
                    counter = 0;
                    break;
                } else {
                    /* Pushing to newPurchasePrices list */
                    newPurchasePricesForSoldItems.push({
                        purchaseId: this.priceHistory[0]?.purchaseId || null,
                        units: this.priceHistory[0].stock,
                        pricePerUnit: this.priceHistory[0].purchasePrice,
                    });

                    /* Subtracting counter by the stock available in this priceHistory, and removing the item from priceHistory */
                    counter -= this.priceHistory[0].stock;
                    this.priceHistory.shift();
                }
            }
        } else {
            this.priceHistory.splice(purchaseHistoryIndex, 1);
        }

        /* Overall Stock = Current Overall - old Purchased Stock */
        this.stock = this.stock - purchaseItem.unitsPurchased;

        return newPurchasePricesForSoldItems;
    };

    addSoldUnitsBackToInventory = (
        purchaseId: number | null,
        item: ItemTypeForRecordingPurchase,
    ) => {

        /* If priceHistory is not a array initializing it to an empty array */
        if (!Array.isArray(this.priceHistory)) {
            this.priceHistory = [];
        }

        /* If stock is not negative */
        if (this.stock > 0) {

            /* If purchaseId is passed */
            if(purchaseId){
                /* Finding the price history with the same purchaseId */
                const purchaseHistoryIndex = this.priceHistory.findIndex((history) => history.purchaseId == purchaseId);
                
                /* If found add stock to the price history and return */
                if(purchaseHistoryIndex != -1){
                    this.priceHistory[purchaseHistoryIndex].stock += item.unitsPurchased;
                    return;
                }
            }
            /* Else pushing to price history */
            this.priceHistory.push({
                purchasePrice: item.pricePerUnit,
                stock: item.unitsPurchased,
                purchaseId: purchaseId,
            });
        }
    };
}
