import { PriceHistoryOfCurrentStockType } from "../../constants";
import { Item } from "../../db";

export class AddItemRequest {
    constructor(
        public companyId: number,
        public isActive: boolean,
        public itemName: string,
        public unitId: number,
        public unitName: string,
        public stock: number,
        public minStockToMaintain?: number,
        public defaultSellingPrice?: number,
        public defaultPurchasePrice?: number,
        public priceHistoryOfCurrentStock?: Array<PriceHistoryOfCurrentStockType> | null;
    ) {}
}

export class AddItemResponse {
    constructor(
        public item: Item,
        public message: string
    ){

    }
}