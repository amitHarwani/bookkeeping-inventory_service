import { Item } from "../../db";

export class UpdateItemRequest {
    constructor(
        public itemId: number,
        public companyId: number,
        public isActive: boolean,
        public itemName: string,
        public unitId: number,
        public unitName: string,
        public minStockToMaintain?: number,
        public defaultSellingPrice?: number,
        public defaultPurchasePrice?: number,
    ) {}
}

export class UpdateItemResponse {
    constructor(
        public item: Item,
        public message: string
    ){

    }
}