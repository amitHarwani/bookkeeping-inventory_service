import { ItemTypeForRecordingPurchase } from "../../constants";

export class RecordPurchaseRequest {
    constructor(
        public purchaseId: number,
        public companyId: number,
        public items: Array<ItemTypeForRecordingPurchase>
    ) {}
}

export class RecordPurchaseResponse {
    constructor(public message: string) {}
}
