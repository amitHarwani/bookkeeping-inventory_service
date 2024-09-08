import { PriceHistoryOfCurrentStockType } from "../constants";

export const subtractPriceHistoryOfCurrentStock = (
    priceHistoryOfCurrentStock: unknown[],
    stockToSubtract: number
) => {
    /* Updated price history */
    let updatedPriceHistoryOfStock: PriceHistoryOfCurrentStockType[] =
        priceHistoryOfCurrentStock as PriceHistoryOfCurrentStockType[];

    /* Stock Left */
    let stockLeft = stockToSubtract;

    /* While stock left is not 0 */
    while (stockLeft != 0 && updatedPriceHistoryOfStock.length) {
        /* If the first element's stock is greater than the stock left */
        if (updatedPriceHistoryOfStock[0]?.stock > stockLeft) {
            /* Subtract from first element an break, all the stock is subtracted */
            updatedPriceHistoryOfStock[0].stock -= stockLeft;
            break;
        } else {
            /* Else remove the first element, and update stockLeft value */
            stockLeft -= updatedPriceHistoryOfStock[0].stock;
            updatedPriceHistoryOfStock.shift();
        }
    }

    return updatedPriceHistoryOfStock;
};
