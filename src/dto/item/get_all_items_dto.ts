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
            itemNameSearchQuery?: string;
        }
    ) {}
}

export class GetAllItemsResponse {
    constructor(
        public items: Item[],
        public hasNextPage: boolean,
        public nextPageCursor?: {
            itemId: number,
            updatedAt: Date
        }
    ){
    }
}
