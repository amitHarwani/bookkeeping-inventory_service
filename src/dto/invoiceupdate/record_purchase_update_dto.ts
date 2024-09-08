import { ItemTypeForPurchasePriceHistoryUpdate } from "../../constants";

export class RecordPurchaseUpdateRequest {
    constructor(
        public purchaseId: number,
        public items: {
            itemsAdded?: Array<ItemTypeForPurchasePriceHistoryUpdate>;
            itemsRemoved?: Array<{
                old: ItemTypeForPurchasePriceHistoryUpdate;
                new: ItemTypeForPurchasePriceHistoryUpdate;
            }>;
            itemsUpdated?: Array<{
                old: ItemTypeForPurchasePriceHistoryUpdate;
                new: ItemTypeForPurchasePriceHistoryUpdate;
            }>;
        }
    ) {}
}

export class RecordPurchaseUpdateResponse {
    constructor(public message: string) {}
}
