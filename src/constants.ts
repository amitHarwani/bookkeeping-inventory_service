export interface PriceHistoryOfCurrentStockType {
    stock: number;
    purchasePrice: number;
    purchaseId?: number | null;
}

export interface CostOfItemsForSaleItemsType {
    purchaseId?: number | null,
    units: number,
    pricePerUnit: number
}

export interface ItemTypeForRecordingPurchase {
    itemId: number;
    unitsPurchased: number;
    pricePerUnit: number;
}

export interface ItemTypeForRecordingSale {
    unitsSold: number;
    sellingPricePerUnit: number;
    itemId: number;
}

export interface SaleItemProfitDetails {
    costOfItems: {
        purchaseId: number | null;
        units: number;
        pricePerUnit: number;
    }[];
    profit: number| null;
    isAllUnitsCovered: boolean;
    remainingUnitsForProfitCalc: number,
    purchaseIds: Array<number>
}

export enum ADJUSTMENT_TYPES {
    ADD = "ADD",
    SUBTRACT = "SUBTRACT",
}

export const REGEX = {
    date: /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/,
    dateWithTime:
        /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|0[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/,
};

export const DATE_TIME_FORMATS = {
    dateFormat: "YYYY-MM-DD",
    timeFormat24hr: "HH:mm:ss",
    dateTimeFormat24hr: "YYYY-MM-DD HH:mm:ss",
};
