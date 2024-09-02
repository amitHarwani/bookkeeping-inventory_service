export class RecordPurchaseRequest {
    constructor(
        public purchaseId: number,
        public itemsPurchased: [
            {
                itemId: number;
                companyId: number;
                unitsPurchased: number;
                pricePerUnit: number;
            },
        ]
    ) {}
}

export class RecordPurchaseResponse {
    constructor(public message: string) {}
}
