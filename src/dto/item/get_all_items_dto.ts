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
        },
        public select?: [keyof Item]
    ) {}
}

export class GetAllItemsResponse<T> {
    constructor(
        public items: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            itemId: number,
            updatedAt: Date
        }
    ){
    }
}
