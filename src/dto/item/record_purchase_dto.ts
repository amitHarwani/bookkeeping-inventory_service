export class RecordPurchaseRequest {
    constructor(
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
