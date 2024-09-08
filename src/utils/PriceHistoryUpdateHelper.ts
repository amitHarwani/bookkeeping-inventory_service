import {
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
        purchaseId: number,
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
}
