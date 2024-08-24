import { ADJUSTMENT_TYPES } from "../../constants";
import { Item } from "../../db";

export class AdjustItemRequest {
    constructor(
        public itemId: number,
        public companyId: number,
        public adjustmentType: ADJUSTMENT_TYPES,
        public stockAdjusted: number,
        public reason: string,
        public pricePerUnit?: number | null,
    ) {}
}

export class AdjustItemResponse {
    constructor(
        public item: Item,
        public message: string
    ){}
}
