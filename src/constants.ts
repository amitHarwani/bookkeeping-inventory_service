export interface PriceHistoryOfCurrentStockType {
    stock: number;
    purchasePrice: number;
    purchaseId?: number;
}

export interface CostOfItemsForSaleItemsType {
    purchaseId?: number,
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
