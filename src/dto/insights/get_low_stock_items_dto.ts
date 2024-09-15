export class GetLowStockItemsRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public cursor?: {
            itemId: number;
        }
    ) {}
}

export class GetLowStockItemsResponse {
    constructor(
        public lowStockItems: Array<{
            itemId: number;
            itemName: string;
            stock: string;
            minStockToMaintain: string | null;
            difference: string;
        }>,
        public nextPageCursor?: {
            itemId: number;
        }
    ) {}
}
