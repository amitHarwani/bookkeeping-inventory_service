
export interface PriceHistoryOfCurrentStockType {
    stock: number,
    purchasePrice: number
}

export enum ADJUSTMENT_TYPES {
    ADD = "ADD",
    SUBTRACT = "SUBTRACT"
}