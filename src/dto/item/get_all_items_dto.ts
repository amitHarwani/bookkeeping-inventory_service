import { Item } from "../../db";

export class GetAllItemsRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public cursor?: {
            itemId: number,
            updatedAt: Date
        },
        public query?: {
            isActive?: boolean;
            isStockLow?: boolean;
        }
    ) {}
}

export class GetAllItemsResponse {
    constructor(
        public items: Item[],
        public nextPageCursor: {
            itemId: number,
            updatedAt: Date
        }
    ){
    }
}
